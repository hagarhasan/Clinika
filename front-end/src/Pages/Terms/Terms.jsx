import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import LegalLayout from '../../Components/LegalLayout/LegalLayout';


const sections = [
    {
        id: "acceptance",
        title: "Acceptance of Terms",
        body: (
            <p>
                By creating an account or using Clinika you agree to these Terms of Service and our{" "}
                <Link to="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the platform.
            </p>
        ),
    },
    {
        id: "service",
        title: "Nature of the Service",
        body: (
            <>
                <p>
                    Clinika is a scheduling and practitioner discovery platform. We help you find verified
                    practitioners, view availability and book visits.
                </p>
                <div className="cl-callout">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>
                        <strong>Not a medical service.</strong> Clinika does not provide medical advice,
                        diagnosis or treatment, and is not for emergencies. In an emergency, contact your
                        local emergency services or our 24/7 helpline immediately.
                    </span>
                </div>
            </>
        ),
    },
    {
        id: "accounts",
        title: "Accounts & Eligibility",
        body: (
            <ul>
                <li>You must be at least 18 years old, or use the platform with a parent or legal guardian.</li>
                <li>Provide accurate information and keep your credentials confidential.</li>
                <li>You are responsible for all activity under your account. Tell us promptly about unauthorized use.</li>
                <li>Doctor accounts require successful credential verification before listing.</li>
            </ul>
        ),
    },
    {
        id: "booking",
        title: "Booking & Cancellations",
        body: (
            <>
                <p>
                    Appointments are agreed between you and the practitioner or clinic. Clinika facilitates
                    the booking and sends reminders but is not a party to the care you receive.
                </p>
                <ul>
                    <li>Availability shown is subject to change until a booking is confirmed.</li>
                    <li>Please cancel or reschedule as early as possible so the slot can be offered to others.</li>
                    <li>Clinics may apply their own cancellation or late-arrival policies.</li>
                </ul>
            </>
        ),
    },
    {
        id: "practitioners",
        title: "Practitioner Listings",
        body: (
            <p>
                We verify practitioner credentials as described in our directory. Listings, ratings and
                experience figures are provided for information only. You are responsible for deciding
                whether a practitioner is right for you.
            </p>
        ),
    },
    {
        id: "use",
        title: "Acceptable Use",
        body: (
            <>
                <p>You agree not to:</p>
                <ul>
                    <li>Provide false identity, credential or contact information.</li>
                    <li>Book appointments you do not intend to attend, or abuse booking slots.</li>
                    <li>Attempt to access other users’ accounts or interfere with platform security.</li>
                    <li>Scrape, copy or resell directory data without written permission.</li>
                    <li>Use the platform for unlawful, harassing or harmful purposes.</li>
                </ul>
            </>
        ),
    },
    {
        id: "ip",
        title: "Intellectual Property",
        body: (
            <p>
                The Clinika name, logo, design and software are owned by Clinika Health, Inc. and its
                licensors. You may use the platform for its intended purpose, but may not copy or
                modify our materials without permission.
            </p>
        ),
    },
    {
        id: "liability",
        title: "Disclaimers & Liability",
        body: (
            <>
                <p>
                    The service is provided “as is” and “as available”. To the fullest extent permitted by
                    law, Clinika is not liable for the quality of care provided by practitioners, missed or
                    delayed appointments, or indirect or consequential losses arising from use of the platform.
                </p>
                <p>Nothing in these terms limits liability that cannot be limited by law.</p>
            </>
        ),
    },
    {
        id: "termination",
        title: "Suspension & Changes",
        body: (
            <p>
                We may suspend or close accounts that breach these terms, and you may close your account
                at any time. We may update these terms; continued use after changes means you accept the
                updated version. These terms are governed by the laws of [Your Jurisdiction].
            </p>
        ),
    },
];

export default function Terms() {
    return (
        <>
            <Helmet>
                <title>Terms & Conditions | Clinika</title>
            </Helmet>
            <LegalLayout
                crumb="Terms of Service"
                badge="Terms of Care"
                badgeIcon="fa-file-contract"
                title="Terms of"
                accent="Service."
                intro="Clear, plain-language terms for using Clinika to find practitioners and manage your appointments."
                updated="October 2026"
                sections={sections}
                contactTitle="Need clarification on these terms?"
                contactText="Our coordination team is happy to help — we typically reply within 2–4 business hours."
            />
        </>
    );
}
