
import { fetchAccessToken } from "hume";
import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
        return NextResponse.json(
            { error: "Missing Hume API credentials" },
            { status: 500 }
        );
    }

    try {
        const accessToken = await fetchAccessToken({
            apiKey,
            secretKey,
        });

        if (!accessToken) {
            return NextResponse.json(
                { error: "Failed to generate access token" },
                { status: 401 }
            );
        }

        return NextResponse.json({
            accessToken,
            configId: process.env.HUME_CONFIG_ID
        });
    } catch (error) {
        console.error("Error fetching access token:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
