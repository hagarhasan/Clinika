import { CalendarDays, CheckCircle2, Search } from "lucide-react";

const careSteps = [
  {
    number: "01",
    icon: Search,
    title: "Find your doctor",
    description: "Search verified doctors by specialty, name, or location.",
  },
  {
    number: "02",
    icon: CalendarDays,
    title: "Choose a time",
    description: "Browse available appointments and pick what works for you.",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Book with confidence",
    description: "Confirm your visit and keep your care organized in one place.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="home-section">
      <div className="container">
        <div className="home-section-heading text-center mx-auto mb-5">
          <span className="home-eyebrow">A LITTLE SIMPLER. A LOT MORE HUMAN.</span>
          <h2 className="mt-2 mb-2">Your next appointment in three steps</h2>
          <p className="mb-0">A straightforward way to find the care and support you deserve.</p>
        </div>
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {careSteps.map(({ number, icon: StepIcon, title, description }, index) => (
            <div className={`col home-rise-in home-delay-${index + 1}`} key={number}>
              <article className="home-step-card card h-100">
                <div className="card-body p-4 p-lg-5">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <span className="home-step-number"><StepIcon size={20} /></span>
                    <span className="home-eyebrow">{number}</span>
                  </div>
                  <h3 className="h5 fw-bold">{title}</h3>
                  <p className="home-muted mb-0">{description}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
