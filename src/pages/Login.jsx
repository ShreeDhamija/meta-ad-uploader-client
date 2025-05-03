import { useAuth } from "@/lib/AuthContext"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


export default function Login() {
    const { isLoggedIn } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoggedIn) {
            navigate("/")
        }
    }, [isLoggedIn, navigate])

    const handleFacebookLogin = () => {
        window.location.href = "https://meta-ad-uploader-server-production.up.railway.app/auth/facebook"
    }

    return (
        <div className="flex justify-center align-center items-center h-screen px-4 overflow-visible">
            <div className="flex rounded-xl overflow-hidden p-6 overflow-visible">
                <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-md min-w-[420px] min-h-[670px] flex flex-col justify-center">
                    <div className="text-center space-y-1">
                        <img
                            src="https://meta-ad-uploader-server-production.up.railway.app/logo.webp"
                            alt="Hero"
                            className=" shadom-sm w-[48px] h-[48px] mx-auto rounded-md mb-2"
                        />
                        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-sm text-muted-foreground">Login with your social account</p>
                    </div>
                    <Button
                        onClick={handleFacebookLogin}
                        variant="secondary"
                        className="w-full bg-black hover:bg-blue-700 text-white rounded-xl shadow-md"
                    >
                        Login with Facebook
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t"></span>
                        </div>
                        <div className="relative flex justify-center text-sm text-gray-500">
                            <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const username = e.target.username.value;
                            const password = e.target.password.value;

                            const res = await fetch("https://meta-ad-uploader-server-production.up.railway.app/auth/manual-login", {
                                method: "POST",
                                credentials: "include",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ username, password })
                            });

                            const data = await res.json();
                            if (data.success) {
                                window.location.href = "/";
                            } else {
                                alert(data.error || "Login failed");
                            }
                        }}
                    >
                        <div className="space-y-1">
                            <Label htmlFor="username" className="text-gray-500">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                placeholder="Enter Username here"
                                className="text-gray-800 rounded-xl bg-white shadow-sm border-gray-300"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="password" className="text-gray-500">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Enter Password here"
                                className="text-gray-500 rounded-xl bg-white shadow-sm border-gray-300"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="text-gray-500 rounded-xl bg-zinc-700 shadow-sm border-gray-300 w-full text-white hover:!bg-black"
                        >
                            Login
                        </Button>
                    </form>



                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account? <a href="/signup" className="underline text-zinc-700">Sign up</a>
                    </p>

                    <p className="text-xs text-center text-muted-foreground mt-2">
                        By clicking continue, you agree to our{" "}
                        <br></br>
                        <a href="#" className="underline text-zinc-600">Terms of Service</a> and{" "}
                        <a href="#" className="underline text-zinc-600">Privacy Policy</a>.
                    </p>
                </div>
            </div >
            <div className="w-[470px] h-[670px] overflow-visible">
                <img
                    src="https://meta-ad-uploader-server-production.up.railway.app/SignUp.png"
                    alt="Login Visual"
                    className="w-full h-full object-cover rounded-[25px] shadow-xl"
                />
            </div>
        </div>
    )
}
