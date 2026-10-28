import { Helmet } from 'react-helmet-async';
import LegalLayout from '../../Components/LegalLayout/LegalLayout';


const sections = [
    {
        id: "overview",
        title: "Overview",
        body: (
            <>
                <p>
                    Clinika Health, Inc. (“Clinika”, “we”, “us”) operates an appointment scheduling and
                    practitioner discovery platform. This policy explains what personal information we
                    collect, why we collect it, and the choices you have.
                </p>
                <div className="cl-callout">
                    <i className="fa-solid fa-circle-info"></i>
                    <span>
                        <strong>Non-diagnostic platform.</strong> Clinika only handles scheduling, verified
                        credential directories, and clinic coordination. We do not provide medical advice,
                        diagnosis, or treatment.
                    </span>
                </div>
            </>
        ),
    },
    {
        id: "collect",
        title: "Information We Collect",
        body: (
            <>
                <ul>
                    <li><strong>Account details:</strong> name, email address, phone number, password (stored hashed) and account role (patient or doctor).</li>
                    <li><strong>Scheduling details:</strong> the doctor, specialty, clinic, date and time you choose, and appointment status.</li>
                    <li><strong>Practitioner credentials:</strong> for doctors, license information, specialty and clinic affiliation used for verification.</li>
                    <li><strong>Messages:</strong> anything you send us through the contact form or support channels.</li>
                    <li><strong>Technical data:</strong> device type, browser, IP address and usage logs collected through cookies and similar technologies.</li>
                </ul>
                <p>
                    Please avoid sharing detailed medical history or diagnostic information in free-text
                    fields. Discuss clinical matters directly with your practitioner.
                </p>
            </>
        ),
    },
    {
        id: "use",
        title: "How We Use Your Information",
        body: (
            <>
                <ul>
                    <li>Create and manage your account and sign you in securely.</li>
                    <li>Book, reschedule and cancel appointments, and send confirmations and reminders.</li>
                    <li>Verify practitioner identity and credentials.</li>
                    <li>Respond to support requests and coordinate with clinics.</li>
                    <li>Protect the platform against fraud, abuse and security incidents.</li>
                    <li>Improve reliability, accessibility and usability of the service.</li>
                </ul>
                <p><strong>We do not sell your personal information.</strong></p>
            </>
        ),
    },
    {
        id: "sharing",
        title: "Sharing & Disclosure",
        body: (
            <>
                <p>We share information only when it is necessary to provide the service:</p>
                <ul>
                    <li><strong>With your practitioner or clinic,</strong> limited to what is needed to fulfil your appointment.</li>
                    <li><strong>With service providers</strong> such as hosting, email/SMS delivery and analytics, bound by confidentiality and data-protection obligations.</li>
                    <li><strong>When required by law,</strong> court order or to protect the rights and safety of users and the public.</li>
                    <li><strong>In a business transfer,</strong> such as a merger, with the same level of protection maintained.</li>
                </ul>
            </>
        ),
    },
    {
        id: "security",
        title: "Data Security",
        body: (
            <>
                <p>
                    We protect your information with encryption in transit (TLS), role-based access
                    controls, activity logging and regular security reviews. Our safeguards are designed
                    around healthcare-grade confidentiality expectations.
                </p>
                <p>
                    No online service can guarantee absolute security. Please use a strong, unique
                    password and sign out on shared devices.
                </p>
            </>
        ),
    },
    {
        id: "cookies",
        title: "Cookies & Similar Technologies",
        body: (
            <>
                <ul>
                    <li><strong>Essential:</strong> keep you signed in and secure your session.</li>
                    <li><strong>Preference:</strong> remember choices such as “Remember this device for 30 days”.</li>
                    <li><strong>Analytics:</strong> help us understand how the platform is used so we can improve it.</li>
                </ul>
                <p>You can control or delete cookies through your browser settings. Blocking essential cookies may prevent sign-in.</p>
            </>
        ),
    },
    {
        id: "rights",
        title: "Your Rights & Choices",
        body: (
            <>
                <p>Depending on where you live, you may have the right to:</p>
                <ul>
                    <li>Access the personal information we hold about you.</li>
                    <li>Correct inaccurate or incomplete information.</li>
                    <li>Request deletion of your account and data.</li>
                    <li>Receive a portable copy of your data.</li>
                    <li>Object to or restrict certain processing, and withdraw consent at any time.</li>
                </ul>
                <p>
                    To exercise these rights, email <a href="mailto:support@clinika.example">support@clinika.example</a>.
                    We aim to respond within 30 days.
                </p>
            </>
        ),
    },
    {
        id: "retention",
        title: "Data Retention",
        body: (
            <p>
                We keep your information for as long as your account is active and as needed to meet
                legal, accounting and record-keeping obligations. When data is no longer required, we
                delete or anonymize it. Clinika is not directed to children under 18 without parental
                or guardian involvement.
            </p>
        ),
    },
    {
        id: "changes",
        title: "Changes to This Policy",
        body: (
            <p>
                We may update this policy from time to time. When we make material changes we will
                update the date at the top of this page and, where appropriate, notify you by email or
                within the portal.
            </p>
        ),
    },
];

export default function Privacy() {
    return (
        <>
            <Helmet>
                <title>Privacy Policy | Clinika</title>
            </Helmet>
            <LegalLayout
                crumb="Privacy Policy"
                badge="Privacy Notice"
                badgeIcon="fa-shield-halved"
                title="Your Privacy,"
                accent="Protected by Design."
                intro="We collect only what we need to schedule your care, keep your account secure, and coordinate with clinics — nothing more."
                updated="October 2026"
                sections={sections}
                contactTitle="Questions about your data?"
                contactText="Reach our privacy team any time — we typically reply within 2–4 business hours."
            />
        </>
    );
}
