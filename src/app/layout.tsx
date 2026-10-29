import type { Metadata } from "next";
import "./globals.css";
import "./screens.css";
import "./identity.css";
import "./clarity.css";
import "./verify.css";
export const metadata: Metadata = {title:"PayPal Verify — Pay only when the deal matches reality",description:"An independent hackathon concept: AI verifies. You decide. PayPal moves the money. Tested with PayPal Sandbox and Gemini.",icons:{icon:"/icon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
