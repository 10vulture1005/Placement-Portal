import{NextResponse}from"next/server";export function GET(){return NextResponse.json({status:"ok",service:"tnp-portal",timestamp:new Date().toISOString()})}
