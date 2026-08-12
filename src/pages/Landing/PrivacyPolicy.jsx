import React from "react";

export default function PrivacyPolicy() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800 space-y-8">
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-10 space-y-8 text-gray-800">
                <h1 className="text-3xl font-semibold">Privacy Policy</h1>
                <p><strong>Effective Date:</strong> August 10, 2026</p>

                <section>
                    <h2 className="text-xl font-medium mb-2">1. Scope and Roles</h2>
                    <p>This Privacy Policy applies to Blip&apos;s websites, applications, and related ad-management and creative-strategy services (collectively, the &quot;Service&quot;). &quot;Blip,&quot; &quot;we,&quot; and &quot;us&quot; refer to the Blip entity identified in your order, subscription, or account.</p>
                    <p>Blip generally acts as a processor or service provider when it handles advertising data and content on a customer&apos;s instructions. Blip acts as a controller or business for account administration, billing, product analytics, support, security, and its own business operations. Customers remain responsible for their instructions to Blip and for their own legal basis, notices, and permissions.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">2. Information We Process</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Account and contact data:</strong> name, email address, profile information, organization or team membership, account identifiers, and support communications.</li>
                        <li><strong>Connected-platform data:</strong> identifiers and credentials needed to connect authorized Meta, Google Drive, Dropbox, TikTok, Slack, or other accounts; selected ad accounts; campaign, ad set, ad, audience-configuration, budget, spend, delivery, conversion, performance, and platform activity data made available through authorized APIs.</li>
                        <li><strong>Customer content:</strong> images, videos, ad copy, landing-page URLs, naming conventions, templates, drafts, brand materials, product information, and other files or instructions submitted to the Service.</li>
                        <li><strong>Creative-strategy data:</strong> customer-authorized ad content, transcripts, classifications, embeddings, performance context, prompts, generated insights, recommendations, and outputs produced for that customer.</li>
                        <li><strong>Billing and transaction data:</strong> subscription status, plan, invoices, and related transaction metadata. Payment card details are handled by our payment provider rather than stored by Blip.</li>
                        <li><strong>Usage data:</strong> configured feature interactions, workflow and session events, diagnostic events, and cookie or similar-technology identifiers where enabled.</li>
                    </ul>
                    <p>Blip does not intentionally request raw personal information about individual ad viewers. Advertising platforms may provide aggregated reporting, audience segments, and conversion metrics selected by the customer.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">3. How We Use Information</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Provide, operate, secure, troubleshoot, and support the Service.</li>
                        <li>Authenticate users and connect to customer-authorized advertising and storage platforms.</li>
                        <li>Create, upload, organize, and manage ads and campaign settings as directed by the customer.</li>
                        <li>Display analytics and generate customer-specific recommendations, summaries, classifications, and creative insights.</li>
                        <li>Process payments, communicate about accounts, and respond to support requests.</li>
                        <li>Monitor reliability, understand feature usage, prevent abuse, and comply with legal obligations.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">4. AI Processing and Customer Isolation</h2>
                    <p><strong>No model training:</strong> Blip does not use customer content, connected Meta account data, Google user data, prompts, embeddings, or AI outputs to train foundation models or improve a model or product feature for other customers.</p>
                    <p>Blip may use Google Gemini and Anthropic Claude APIs to perform customer-requested analysis or generation. Information is sent only as needed to produce the requested result for that customer. Blip does not pool customer information, create shared cross-customer datasets, sell customer data, or disclose one customer&apos;s identifiable content, performance data, embeddings, or private insights to another customer.</p>
                    <p>Before a feature sends ad videos or other customer creative content to an AI provider for creative-strategy analysis, Blip will provide notice and obtain affirmative permission through the Service or a written agreement. Customers may decline that optional processing. Blip does not opt customer data into provider model training or use customer data to fine-tune a provider model.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">5. Google API Data</h2>
                    <p>When a user selects files from Google Drive, Blip accesses only the files the user selects and processes them to complete the requested action, such as transferring media to an advertising platform. Blip does not use Google user data for advertising, model training, or unrelated analytics.</p>
                    <p>Blip&apos;s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google API Services User Data Policy</a>, including its Limited Use requirements. Temporary working copies created to complete a user-requested transfer are removed after the workflow finishes, subject to operational logs and provider backup cycles.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">6. When Information Is Disclosed</h2>
                    <p>Blip may disclose information:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>To infrastructure, database, AI, analytics, support, payment, communications, and storage providers that help operate the Service and process information on Blip&apos;s behalf.</li>
                        <li>To Meta and other connected platforms when a user directs Blip to retrieve information or create or modify ads.</li>
                        <li>To members of the customer&apos;s organization according to its account and team configuration.</li>
                        <li>When required by law, legal process, or to protect rights, safety, and the integrity of the Service.</li>
                        <li>In connection with a merger, financing, acquisition, or sale of assets, subject to appropriate confidentiality protections.</li>
                    </ul>
                    <p>Blip does not sell customer personal information or Customer Content. The current vendor list, security practices, and data-processing terms are available on our <a href="https://withblip.com/data-safety/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Data Safety and DPA page</a>.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">7. Support Access and Confidentiality</h2>
                    <p>Authorized personnel may access account information and customer insights when reasonably necessary to provide support, maintain the Service, investigate security or reliability issues, or comply with law. Blip personnel do not access underlying customer creative files for ordinary support. Nonpublic customer information must be handled confidentially and only for authorized purposes.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">8. Retention and Deletion</h2>
                    <p>Blip retains information while an account is active and as reasonably necessary to provide the Service, maintain business and security records, resolve disputes, and comply with law. Different records may have different retention periods based on their purpose.</p>
                    <p>A customer may request deletion of account data, creative-strategy records, and associated embeddings by contacting us. Blip will delete eligible data from active systems within a commercially reasonable period, subject to legal obligations, fraud-prevention records, and provider backup cycles. Backup copies may remain until overwritten or expired under the applicable provider&apos;s ordinary schedule.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">9. Security</h2>
                    <p>Blip uses safeguards appropriate to the nature of the Service, including HTTPS/TLS for transmission over public networks, authenticated access, provider-managed encryption at rest for primary databases, scoped platform permissions, and managed cloud infrastructure. No method of transmission or storage can be guaranteed completely secure.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">10. Cookies and Analytics</h2>
                    <p>Blip uses cookies, local storage, sessions, and similar technologies for authentication, workflow continuity, preferences, security, support, and configured product analytics. Our website and application may use services such as PostHog, Google Tag Manager, and Intercom. Browser settings can limit some technologies, but doing so may affect Service functionality.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">11. International Processing</h2>
                    <p>Blip and its providers may process information in the United States and other countries where they operate. Where applicable law requires transfer safeguards, Blip will use an appropriate contractual or legal transfer mechanism.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">12. Privacy Choices and Rights</h2>
                    <p>Depending on applicable law, individuals may have rights to request access, correction, deletion, restriction, objection, or portability. Because Blip often processes data on a customer&apos;s behalf, we may direct a request to the relevant customer. Users can revoke a connected platform&apos;s access through that platform&apos;s settings.</p>
                    <p>To make a privacy request, contact <a href="mailto:shree@withblip.com" className="text-blue-600 underline">shree@withblip.com</a>.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">13. Children&apos;s Privacy</h2>
                    <p>The Service is intended for businesses and is not directed to children. Blip does not knowingly collect personal information from children under 16.</p>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-2">14. Changes and Contact</h2>
                    <p>Blip may update this policy as the Service and applicable requirements change. We will update the date above and provide reasonable advance notice of material changes when appropriate.</p>
                    <p>Questions and requests may be sent to <a href="mailto:shree@withblip.com" className="text-blue-600 underline">shree@withblip.com</a>.</p>
                </section>
            </div>
        </div>
    );
}
