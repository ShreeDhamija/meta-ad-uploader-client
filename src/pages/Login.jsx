import { useAuth } from "@/lib/AuthContext"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useIntercom } from "@/lib/useIntercom";
import SignUpImg from "../assets/signup.webp?url"
import Rocket from "../assets/rocket2.webp?url"
import Book from "../assets/Book.webp?url"
import Cat from "../assets/Cat.webp?url"
import Moon from "../assets/Moon.webp?url"
import Meteor from "../assets/Meteor.webp?url"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


export default function Login() {
    const { isLoggedIn } = useAuth()
    const navigate = useNavigate()
    useIntercom(true, true);


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
        <div className="relative flex justify-center align-center items-center h-screen md:px-4 overflow-visible">

            <img src={Rocket}
                alt=""
                className="md:hidden absolute right-[-50px] top-20 w-32 h-auto pointer-events-none"
            />
            <img src={Moon}
                alt=""
                className="md:hidden absolute left-[-50px] top-16 w-28 h-auto pointer-events-none"
            />

            <img src={Meteor}
                alt=""
                className="md:hidden absolute top-0 -translate-y-1/2  w-28 h-auto pointer-events-none"
            />

            <img src={Cat}
                alt=""
                className="md:hidden absolute bottom-[-10px] left-[-50px]  w-[200px] h-auto pointer-events-none"
            />

            <img src={Book}
                alt=""
                className="md:hidden absolute bottom-[-10px] right-[-20px]  w-[150px] h-auto pointer-events-none"
            />

            {/* Right edge image - only on mobile */}
            <img
                src="/path-to-your-image.png"
                alt=""
                className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 w-24 h-auto pointer-events-none"
            />
            <div className="flex w-full md:w-auto rounded-xl overflow-hidden md:p-6 overflow-visible">

                <div className="w-full h-screen md:max-w-md space-y-6 bg-white p-8 md:rounded-3xl md:shadow-lg md:min-w-[420px] min-h-[650px] md:h-auto flex flex-col justify-center">

                    <div className="text-center space-y-1">
                        <img
                            src="https://api.withblip.com/logo.webp"
                            alt="Hero"
                            className=" shadom-sm w-[48px] h-[48px] mx-auto rounded-md mb-2"
                        />
                        <h2 className="text-2xl font-bold tracking-tight">Welcome To Blip</h2>
                        <p className="text-sm text-muted-foreground">Login with your facebook account to get started</p>
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


            <div className="hidden md:block w-[490px] h-[700px] overflow-visible">
                <img src={SignUpImg}
                    alt="Login Visual"
                    className="w-full h-full object-cover"

                />
            </div>
        </div >
    )
}