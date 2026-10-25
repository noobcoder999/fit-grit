import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../utils/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    if (!/^FG-[A-Z2-9]{6}$/.test(code)) {
      return NextResponse.json(
        {
          valid: false,
          message: "That invite code doesn't look right.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: invite, error } = await supabase
      .from("invite_codes")
      .select("id, status, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("Invite validation error:", error);

      return NextResponse.json(
        {
          valid: false,
          message: "We couldn't check that code right now.",
        },
        { status: 500 }
      );
    }

    if (!invite) {
      return NextResponse.json(
        {
          valid: false,
          message: "We couldn't find that invite code.",
        },
        { status: 404 }
      );
    }

    if (invite.status !== "unused") {
      return NextResponse.json(
        {
          valid: false,
          message: "This invite code is no longer available.",
        },
        { status: 409 }
      );
    }

    if (
      invite.expires_at &&
      new Date(invite.expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          valid: false,
          message: "This invite code has expired.",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
    });
  } catch (error) {
    console.error("Invite validation failure:", error);

    return NextResponse.json(
      {
        valid: false,
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}