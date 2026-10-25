import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
} from "crypto";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../../../utils/supabase/admin";

export async function POST(request: Request) {
  let createdUserId: string | null = null;

  try {
    const body = await request.json();

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    const fullName =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const age = Number(body.age);

    const phone =
      typeof body.phone === "string"
        ? body.phone.replace(/\D/g, "")
        : "";

    const pin =
      typeof body.pin === "string"
        ? body.pin.trim()
        : "";

    // -----------------------------------------------------
    // Validate
    // -----------------------------------------------------

    if (!/^FG-[A-Z2-9]{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid invite code." },
        { status: 400 }
      );
    }

    if (fullName.length < 2 || fullName.length > 60) {
      return NextResponse.json(
        { error: "Please enter a valid name." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(age) || age < 10 || age > 100) {
      return NextResponse.json(
        { error: "Please enter a valid age." },
        { status: 400 }
      );
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid Indian mobile number." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "Please choose a valid 6-digit PIN." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // -----------------------------------------------------
    // Re-check invite
    // -----------------------------------------------------

    const { data: invite, error: inviteError } = await admin
      .from("invite_codes")
      .select("id, status, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (inviteError) {
      console.error("Invite lookup error:", inviteError);

      return NextResponse.json(
        { error: "We couldn't activate your account right now." },
        { status: 500 }
      );
    }

    if (!invite || invite.status !== "unused") {
      return NextResponse.json(
        { error: "This invite is no longer available." },
        { status: 409 }
      );
    }

    if (
      invite.expires_at &&
      new Date(invite.expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "This invite has expired." },
        { status: 410 }
      );
    }

    // -----------------------------------------------------
    // Internal Supabase identity
    // -----------------------------------------------------

    const identity = randomUUID();

    const internalEmail =
      `client-${identity}@auth.fitandgrit.invalid`;

    const internalPassword =
      randomBytes(32).toString("base64url");

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: internalEmail,
        password: internalPassword,
        email_confirm: true,
        user_metadata: {
          account_type: "client",
        },
      });

    if (authError || !authData.user) {
      console.error("Auth creation error:", authError);

      return NextResponse.json(
        { error: "We couldn't create your account." },
        { status: 500 }
      );
    }

    createdUserId = authData.user.id;

    // -----------------------------------------------------
    // Client profile
    // -----------------------------------------------------

    const { error: profileError } = await admin
      .from("profiles")
      .insert({
        id: createdUserId,
        role: "client",
        full_name: fullName,
        age,
        phone: `+91${phone}`,
      });

    if (profileError) {
      throw profileError;
    }

    // -----------------------------------------------------
    // Secure PIN hash
    //
    // We NEVER save the real PIN.
    // -----------------------------------------------------

    const pinSalt = randomBytes(16).toString("hex");

    const pinHash = scryptSync(
      pin,
      pinSalt,
      64
    ).toString("hex");

    const { error: credentialError } = await admin
      .from("client_login_credentials")
      .insert({
        client_id: createdUserId,
        auth_email: internalEmail,
        pin_salt: pinSalt,
        pin_hash: pinHash,
      });

    if (credentialError) {
      throw credentialError;
    }

    // -----------------------------------------------------
    // Trusted device
    // -----------------------------------------------------

    const deviceToken =
      randomBytes(32).toString("base64url");

    const deviceTokenHash = createHash("sha256")
      .update(deviceToken)
      .digest("hex");

    const { error: deviceError } = await admin
      .from("client_devices")
      .insert({
        client_id: createdUserId,
        device_token_hash: deviceTokenHash,
        device_name: "Primary device",
      });

    if (deviceError) {
      throw deviceError;
    }

    // -----------------------------------------------------
    // Claim invite
    // -----------------------------------------------------

    const { data: claimedInvite, error: claimError } =
      await admin
        .from("invite_codes")
        .update({
          status: "activated",
          client_id: createdUserId,
          activated_at: new Date().toISOString(),
        })
        .eq("id", invite.id)
        .eq("status", "unused")
        .select("id")
        .maybeSingle();

    if (claimError || !claimedInvite) {
      throw new Error("INVITE_ALREADY_CLAIMED");
    }

    // -----------------------------------------------------
    // Start Supabase session
    // -----------------------------------------------------

    const publicSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: sessionData, error: signInError } =
      await publicSupabase.auth.signInWithPassword({
        email: internalEmail,
        password: internalPassword,
      });

    if (signInError || !sessionData.session) {
      throw signInError || new Error("Could not create session");
    }

    const response = NextResponse.json({
      success: true,
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    });

    response.cookies.set(
      "fitgrit_device",
      deviceToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      }
    );

    return response;
  } catch (error) {
    console.error("Activation failure:", error);

    // Delete partial account if anything failed.
    if (createdUserId) {
      try {
        const admin = createAdminClient();

        await admin.auth.admin.deleteUser(createdUserId);
      } catch (cleanupError) {
        console.error("Activation cleanup failure:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          error.message === "INVITE_ALREADY_CLAIMED"
            ? "Someone has already activated this invite."
            : "We couldn't finish activation. Please try again.",
      },
      { status: 500 }
    );
  }
}