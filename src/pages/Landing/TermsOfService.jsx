// src/pages/TermsOfService.jsx
import React from "react";

export default function TermsOfService() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800 space-y-8">
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-10 space-y-8 text-gray-800">

                <h1 className="text-3xl font-semibold">Terms of Service</h1>
                <p><strong>Effective Date:</strong> May 7, 2025</p>

                <section>
                    <h2 className="text-xl font-medium mb-2">1. Acceptance of Terms</h2>
                    <p>By accessing or using Blip ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these Terms, please do not use the Service.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">2. Description of Service</h2>
                    <p>Blip is a platform for managing and uploading ad content across ad accounts, campaigns, and ad sets.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">3. User Accounts</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>You must be at least 18 years old to use Blip.</li>
                        <li>You are responsible for account security and activity.</li>
                        <li>Notify us immediately of unauthorized account use.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">4. User Content</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>You retain ownership of uploaded content.</li>
                        <li>You grant Blip a license to use your content for service operation.</li>
                        <li>No unlawful or infringing content may be uploaded.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">5. Privacy</h2>
                    <p>Your use of Blip is also governed by our Privacy Policy.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">6. Termination</h2>
                    <p>We may suspend or terminate access for violating these Terms or harming the Service.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">7. Disclaimers</h2>
                    <p>Blip is provided “as is” without warranties of any kind.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">8. Limitation of Liability</h2>
                    <p>We are not liable for indirect or consequential damages from using the Service.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">9. Changes to Terms</h2>
                    <p>We may update these Terms. Continued use means acceptance of the new terms.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">10. Contact</h2>
                    <p>Questions? Email us at <a href="mailto:hello@storeos.co" className="text-blue-600 underline">hello@storeos.co</a>.</p>
                </section>
            </div>
        </div>
    );
}
