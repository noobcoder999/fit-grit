import {
  randomUUID,
  timingSafeEqual,
  scryptSync,
} from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../../utils/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone =
      typeof body.phone === "string"
        ? body.phone.replace(/\D/g, "")
        : "";

    const pin =
      typeof body.pin === "string"
        ? body.pin.trim()
        : "";

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid mobile number." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "Please enter your 6-digit PIN." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, phone, role")
      .eq("phone", `+91${phone}`)
      .eq("role", "client")
      .maybeSingle();

    if (profileError) {
      console.error(profileError);

      return NextResponse.json(
        { error: "We couldn't log you in right now." },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Phone number or PIN is incorrect." },
        { status: 401 }
      );
    }

    const { data: credentials, error: credentialError } =
      await admin
        .from("client_login_credentials")
        .select(
          "auth_email, pin_salt, pin_hash, failed_attempts, locked_until"
        )
        .eq("client_id", profile.id)
        .maybeSingle();

    if (credentialError || !credentials) {
      return NextResponse.json(
        { error: "Phone number or PIN is incorrect." },
        { status: 401 }
      );
    }

    if (
      credentials.locked_until &&
      new Date(credentials.locked_until).getTime() > Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "Too many incorrect attempts. Please try again later.",
        },
        { status: 429 }
      );
    }

    const candidateHash = scryptSync(
      pin,
      credentials.pin_salt,
      64
    ).toString("hex");

    const savedBuffer = Buffer.from(
      credentials.pin_hash,
      "hex"
    );

    const candidateBuffer = Buffer.from(
      candidateHash,
      "hex"
    );

    const pinMatches =
      savedBuffer.length === candidateBuffer.length &&
      timingSafeEqual(savedBuffer, candidateBuffer);

    if (!pinMatches) {
      const nextAttempts =
        (credentials.failed_attempts || 0) + 1;

      const shouldLock = nextAttempts >= 5;

      await admin
        .from("client_login_credentials")
        .update({
          failed_attempts: shouldLock ? 0 : nextAttempts,
          locked_until: shouldLock
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("client_id", profile.id);

      return NextResponse.json(
        {
          error: shouldLock
            ? "Too many incorrect attempts. Try again in 15 minutes."
            : "Phone number or PIN is incorrect.",
        },
        { status: 401 }
      );
    }

    await admin
      .from("client_login_credentials")
      .update({
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", profile.id);

    const internalPassword = randomUUID();

    const { error: passwordError } =
      await admin.auth.admin.updateUserById(
        profile.id,
        {
          password: internalPassword,
        }
      );

    if (passwordError) {
      console.error(passwordError);

      return NextResponse.json(
        { error: "We couldn't log you in right now." },
        { status: 500 }
      );
    }

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
        email: credentials.auth_email,
        password: internalPassword,
      });

    if (signInError || !sessionData.session) {
      console.error(signInError);

      return NextResponse.json(
        { error: "We couldn't log you in right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    });
  } catch (error) {
    console.error("Client login failure:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}