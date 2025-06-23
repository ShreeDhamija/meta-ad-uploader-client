// src/pages/PrivacyPolicy.jsx
import React from "react";

export default function PrivacyPolicy() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800 space-y-8">
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-10 space-y-8 text-gray-800">
                <h1 className="text-3xl font-semibold">Privacy Policy</h1>
                <p><strong>Effective Date:</strong> May 7, 2025</p>

                <section>
                    <h2 className="text-xl font-medium mb-2">1. Introduction</h2>
                    <p>This policy explains how Blip collects and uses your personal data.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">2. Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Personal information like name and email.</li>
                        <li>Usage data such as IP address and interactions.</li>
                        <li>Uploaded content like media files.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">3. How We Use Information</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>To provide and improve the Service.</li>
                        <li>To communicate with users.</li>
                        <li>To fulfill legal obligations.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">4. Data Sharing</h2>
                    <p>We do not sell your data. We share it only with trusted providers under strict confidentiality.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">5. Data Security</h2>
                    <p>We use industry-standard practices to secure your information, but cannot guarantee 100% security.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">6. Your Rights</h2>
                    <p>Depending on your region, you may access, correct, or delete your data. Contact <a href="mailto:privacy@blipapp.com" className="text-blue-600 underline">privacy@blipapp.com</a>.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">7. Cookies</h2>
                    <p>We use cookies for functionality. You can disable them in your browser, though some features may break.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">8. Third-Party Services</h2>
                    <p>We are not responsible for the practices of third-party sites linked from Blip.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">9. Changes to This Policy</h2>
                    <p>We may revise this policy and notify you via updates on this page.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">10. Contact</h2>
                    <p>Email us at <a href="mailto:hello@storeos.co" className="text-blue-600 underline">hello@storeos.co</a> with any privacy-related questions.</p>
                </section>
            </div>
        </div>
    );
}
