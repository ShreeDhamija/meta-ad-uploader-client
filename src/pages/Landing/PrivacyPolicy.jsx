// // src/pages/PrivacyPolicy.jsx
// import React from "react";

// export default function PrivacyPolicy() {
//     return (
//         <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800 space-y-8">
//             <div className="bg-white rounded-2xl shadow-md p-6 sm:p-10 space-y-8 text-gray-800">
//                 <h1 className="text-3xl font-semibold">Privacy Policy</h1>
//                 <p><strong>Effective Date:</strong> May 7, 2025</p>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">1. Introduction</h2>
//                     <p>This policy explains how Blip collects and uses your personal data.</p>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">2. Information We Collect</h2>
//                     <ul className="list-disc pl-5 space-y-1">
//                         <li>Personal information like name and email.</li>
//                         <li>Usage data such as IP address and interactions.</li>
//                         <li>Uploaded content like media files.</li>
//                     </ul>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">3. How We Use Information</h2>
//                     <ul className="list-disc pl-5 space-y-1">
//                         <li>To provide and improve the Service.</li>
//                         <li>To communicate with users.</li>
//                         <li>To fulfill legal obligations.</li>
//                     </ul>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">4. Data Sharing</h2>
//                     <p>We do not sell your data. We share it only with trusted providers under strict confidentiality.</p>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">5. Data Security</h2>
//                     <p>We use industry-standard practices to secure your information, but cannot guarantee 100% security.</p>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">6. Your Rights</h2>
//                     <p>Depending on your region, you may access, correct, or delete your data. Contact <a href="mailto:privacy@blipapp.com" className="text-blue-600 underline">privacy@blipapp.com</a>.</p>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">7. Cookies</h2>
//                     <p>We use cookies for functionality. You can disable them in your browser, though some features may break.</p>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">8. Third-Party Services</h2>
//                     <p>We are not responsible for the practices of third-party sites linked from Blip.</p>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">9. Changes to This Policy</h2>
//                     <p>We may revise this policy and notify you via updates on this page.</p>
//                 </section>

//                 <section>
//                     <h2 className="text-xl font-medium mb-2">10. Contact</h2>
//                     <p>Email us at <a href="mailto:hello@storeos.co" className="text-blue-600 underline">hello@storeos.co</a> with any privacy-related questions.</p>
//                 </section>
//             </div>
//         </div>
//     );
// }

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
                    <p>
                        This policy explains how Blip collects, uses, and protects your personal data. This applies to all users, including those authenticating or connecting via Facebook and Google. Our data practices comply with requirements from both Meta and Google.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">2. Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Personal information such as name, email address, and profile picture (if you log in with Facebook or Google).</li>
                        <li>Google Login: If you choose to log in with Google, we may access your Google basic profile information (name, email, profile photo) solely for account authentication and personalization.</li>
                        <li>Usage data such as IP address and interactions.</li>
                        <li>Uploaded content such as media files you provide.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">3. How We Use Information</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>To provide, maintain, and improve the Service.</li>
                        <li>To authenticate your identity via Facebook or Google.</li>
                        <li>To personalize your experience.</li>
                        <li>To communicate with users.</li>
                        <li>To fulfill legal obligations.</li>
                        <li>Google Login: Your Google information is used only to create and manage your Blip account, and for support communication as needed.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">4. Data Sharing</h2>
                    <p>
                        We do <strong>not</strong> sell your data. We share data only with trusted service providers under strict confidentiality agreements, and only as needed to provide our Service.
                        <br /><br />
                        <strong>Google User Data:</strong> We do not share or transfer your Google user data to third parties except as necessary to provide you with Blip’s core functionality. We do not use your Google information for advertising or analytics. We never sell your Google data.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">5. Data Security</h2>
                    <p>
                        We use industry-standard practices (such as HTTPS and encryption at rest) to protect your information. Access to your personal data is limited to authorized personnel only. However, no method of transmission over the Internet or electronic storage is 100% secure.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">6. Your Rights</h2>
                    <p>
                        Depending on your region, you may have the right to access, correct, export, or delete your personal data at any time. To make a request, contact <a href="mailto:privacy@blipapp.com" className="text-blue-600 underline">privacy@blipapp.com</a>.
                        <br /><br />
                        If you have logged in with Google or Facebook and wish to revoke Blip’s access, you may also do so via your respective account provider’s security settings.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">7. Data Retention and Deletion</h2>
                    <p>
                        We retain your data only as long as your account is active or as required by law. If you delete your Blip account or request erasure, your data (including Google/Facebook information) will be deleted from our servers within 30 days, unless retention is required for legal or compliance purposes.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">8. Cookies</h2>
                    <p>
                        We use cookies and similar technologies for functionality such as login persistence and security. You can disable cookies in your browser, though some features may be limited or unavailable.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">9. Third-Party Services</h2>
                    <p>
                        Our Service may contain links to third-party websites or services that are not operated by Blip. We are not responsible for the content or privacy practices of those third parties.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">10. Children’s Privacy</h2>
                    <p>
                        Blip does not knowingly collect or solicit information from anyone under the age of 16. If you believe a child under 16 has provided us with personal data, please contact us so we can remove it.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">11. Limited Use Disclosure (Google APIs)</h2>
                    <p>
                        Blip’s use and transfer of information received from Google APIs to any other app will adhere to the
                        <a
                            href="https://developers.google.com/terms/api-services-user-data-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline ml-1"
                        >
                            Google API Services User Data Policy
                        </a>
                        , including the Limited Use requirements.<br /><br />
                        <strong>Summary:</strong> We only request the minimum Google data needed for authentication and will not use this data for any purpose other than providing and improving core Blip features. We do not use Google data for advertising, marketing, or analytics. We never sell or transfer your Google data except to deliver the requested Blip service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">12. Changes to This Policy</h2>
                    <p>
                        We may revise this policy from time to time. If significant changes are made, we will notify users by updating the date above and, where appropriate, via in-app notice.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">13. Contact</h2>
                    <p>
                        For privacy-related questions, contact us at <a href="mailto:hello@storeos.co" className="text-blue-600 underline">hello@storeos.co</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
