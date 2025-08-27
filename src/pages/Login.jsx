import { useAuth } from "@/lib/AuthContext"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import SignUpImg from "../assets/signup.webp?url"
import { ShineBorder } from "@/components/magicui/shine-border";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


export default function Login() {
    const { isLoggedIn } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoggedIn) {
            navigate("/")
        }
    }, [isLoggedIn, navigate])

    const handleFacebookLogin = () => {

        console.log("API_BASE_URL:", API_BASE_URL);
        window.location.href = `${API_BASE_URL}/auth/facebook?state=login`;
    }

    return (
        <div className="flex justify-center align-center items-center h-screen px-4 overflow-visible">


            <div className="flex rounded-xl overflow-hidden p-6 overflow-visible">

                <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl shadow-lg min-w-[420px] min-h-[650px] flex flex-col justify-center">

                    <div className="text-center space-y-1">
                        <img
                            src="https://api.withblip.com/logo.webp"
                            alt="Hero"
                            className=" shadom-sm w-[48px] h-[48px] mx-auto rounded-md mb-2"
                        />
                        <h2 className="text-2xl font-bold tracking-tight">Welcome To Blip</h2>
                        <p className="text-sm text-muted-foreground">Login with your facebook account</p>
                    </div>
                    <Button
                        onClick={handleFacebookLogin}
                        variant="secondary"
                        className="w-full bg-[#1877F2] hover:bg-[#0866FF] text-white rounded-xl shadow-md flex items-center justify-center gap-2 h-[40px]"
                    >
                        <img
                            src="https://api.withblip.com/facebooklogo.png"
                            alt="Facebook"
                            className="w-5 h-5"
                        />
                        Login with Facebook
                    </Button>



                    <p className="text-xs text-center text-muted-foreground mt-2">
                        By clicking continue, you agree to our{" "}
                        <br></br>
                        <a href="https://app.withblip.com/terms-of-service" className="underline text-zinc-600">Terms of Service</a> and{" "}
                        <a href="https://app.withblip.com/privacy-policy" className="underline text-zinc-600">Privacy Policy</a>.
                    </p>

                </div>


            </div >


            <div className="w-[490px] h-[700px] overflow-visible">
                <img src={SignUpImg}
                    alt="Login Visual"
                    className="w-full h-full object-cover"

                />
            </div>
        </div >
    )
}
