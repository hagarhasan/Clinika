import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import LegalLayout from '../../Components/LegalLayout/LegalLayout';

const features = [
    { icon: "fa-keyboard", title: "Keyboard Navigation", text: "Every page and form can be used without a mouse, with visible focus indicators." },
    { icon: "fa-ear-listen", title: "Screen Reader Support", text: "Semantic markup, labels and landmarks for assistive technologies." },
    { icon: "fa-circle-half-stroke", title: "Readable Contrast", text: "Text and controls designed to meet WCAG AA contrast ratios." },
    { icon: "fa-text-height", title: "Scalable & Responsive", text: "Layouts adapt to zoom, larger text and every screen size." },
];

const sections = [
    {
        id: "commitment",
        title: "Our Commitment",
        body: (
            <p>
                Everyone should be able to find care and book appointments independently. We work to
                make Clinika usable by people of all abilities, including those who use assistive
                technology or have temporary or situational limitations.
            </p>
        ),
    },
    {
        id: "standards",
        title: "Standards We Follow",
        body: (
            <p>
                We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA.
                We review new features against these guidelines and test with keyboards and screen
                readers as part of our release process.
            </p>
        ),
    },
    {
        id: "features",
        title: "Accessibility Features",
        body: (
            <ul>
                <li>Skip-to-content and logical heading structure on every page.</li>
                <li>Clearly labelled form fields with helpful, text-based error messages.</li>
                <li>Visible focus rings on all interactive elements.</li>
                <li>Information is never conveyed by color alone.</li>
                <li>Text can be resized up to 200% without loss of content or function.</li>
                <li>Compatible with current versions of major browsers and screen readers.</li>
            </ul>
        ),
    },
    {
        id: "limitations",
        title: "Known Limitations",
        body: (
            <p>
                Some third-party content, such as embedded sign-in providers or older documents, may not
                yet be fully accessible. We are working with our partners to improve these areas.
            </p>
        ),
    },
    {
        id: "feedback",
        title: "Feedback & Assistance",
        body: (
            <>
                <p>
                    If you face a barrier on Clinika, or need information in another format, please tell
                    us. We aim to respond within 5 business days.
                </p>
                <ul>
                    <li>Email: <a href="mailto:support@clinika.example">support@clinika.example</a></li>
                    <li>Phone: <a href="tel:+201000000000">+20 100 000 0000</a></li>
                    <li>Or use our <Link to="/contact">contact form</Link>.</li>
                </ul>
            </>
        ),
    },
];

export default function Accessibility() {
    return (
        <>
            <Helmet>
                <title>Accessibility | Clinika</title>
            </Helmet>
            <LegalLayout
                crumb="Accessibility"
                badge="Accessibility Statement"
                badgeIcon="fa-universal-access"
                title="Healthcare Access,"
                accent="For Everyone."
                intro="We design Clinika to be perceivable, operable and understandable for every patient and practitioner."
                updated="October 2026"
                sections={sections}
                contactTitle="Found an accessibility barrier?"
                contactText="Let us know and we will work with you to fix it."
            >
                <div className="cl-feature-grid">
                    {features.map((f) => (
                        <div className="cl-feature-card" key={f.title}>
                            <span className="cl-icon-box">
                                <i className={`fa-solid ${f.icon}`}></i>
                            </span>
                            <h3>{f.title}</h3>
                            <p>{f.text}</p>
                        </div>
                    ))}
                </div>
            </LegalLayout>
        </>
    );
}
