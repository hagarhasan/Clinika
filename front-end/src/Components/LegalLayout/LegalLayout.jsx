import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Layout مشترك لصفحات Privacy / Terms / Accessibility
 *
 * sections: [{ id, title, body: <JSX/> }]  (عرّفها برّه الكومبوننت عشان ما تتغيرش مع كل render)
 * children: محتوى إضافي بيظهر بين الهيدر والمحتوى (زي كروت المميزات)
 */
export default function LegalLayout({
    crumb,
    badge,
    badgeIcon = "fa-shield-halved",
    title,
    accent,
    intro,
    updated,
    sections,
    contactTitle = "Questions about this page?",
    contactText = "Our coordination team typically replies within 2–4 business hours.",
    children,
}) {
    const [active, setActive] = useState(sections[0]?.id);

    useEffect(() => {
        document.title = `${crumb} | Clinika`;
        window.scrollTo(0, 0);
    }, [crumb]);

    useEffect(() => {
        const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActive(visible[0].target.id);
            },
            { rootMargin: "-20% 0px -65% 0px" }
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [sections]);

    const handleScrollTo = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
            setActive(id);
        }
    };

    return (
        <main className="cl-page">
            <div className="container-fluid px-3 px-lg-5">
                <div className="cl-page-inner">
                    {/* Breadcrumb */}
                    <nav className="cl-breadcrumb" aria-label="Breadcrumb">
                        <Link to="/">
                            <i className="fa-solid fa-house"></i> Home
                        </Link>
                        <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
                        <span aria-current="page">{crumb}</span>
                    </nav>

                    <header>
                        <span className="cl-badge">
                            <i className={`fa-solid ${badgeIcon}`}></i> {badge}
                        </span>
                        <h1 className="cl-page-title">
                            {title} <span className="cl-accent">{accent}</span>
                        </h1>
                        <p className="cl-page-intro">{intro}</p>
                        <div className="cl-meta">
                            <span className="cl-meta-pill">
                                <i className="fa-regular fa-calendar"></i> Last updated: {updated}
                            </span>
                            <span className="cl-meta-pill">
                                <i className="fa-regular fa-clock"></i> {sections.length} sections
                            </span>
                        </div>
                    </header>

                    {children}

                    <div className="row gx-lg-4 gy-4 mt-1">
                        <aside className="col-lg-3 d-none d-lg-block">
                            <nav className="cl-toc" aria-label="On this page">
                                <p className="cl-toc-title">On this page</p>
                                {sections.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleScrollTo(s.id)}
                                        className={active === s.id ? "active" : ""}
                                    >
                                        {s.title}
                                    </button>
                                ))}
                            </nav>
                        </aside>

                        <div className="col-lg-9">
                            <article className="cl-legal-card">
                                {sections.map((s, i) => (
                                    <section key={s.id} id={s.id} className="cl-legal-section">
                                        <h2>
                                            <span className="cl-sec-num">{String(i + 1).padStart(2, "0")}</span>
                                            {s.title}
                                        </h2>
                                        {s.body}
                                    </section>
                                ))}
                            </article>

                            <div className="cl-contact-strip">
                                <div className="cl-contact-text">
                                    <span className="cl-icon-box">
                                        <i className="fa-regular fa-envelope"></i>
                                    </span>
                                    <div>
                                        <h3>{contactTitle}</h3>
                                        <p>{contactText}</p>
                                    </div>
                                </div>
                                <Link className="cl-book-btn" to="/contact">
                                    Contact Support
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
