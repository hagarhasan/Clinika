import { Search, CalendarDays, CircleCheck } from "lucide-react";

export default function HowItWorksSection() {
  return (
    <section className="home-how-wrapper">
      <div className="container">
        <div className="home-how-section">
          <div className="home-how-header">
            <div>
              <span className="home-section-eyebrow">
                A LITTLE SIMPLER. A LOT MORE HUMAN.
              </span>
              <h2>Your next appointment, in three steps.</h2>
            </div>

            <p className="home-how-header-description">
              Less time figuring things out. More space to focus on what matters:
              you and your loved ones' health.
            </p>
          </div>

          <div className="home-how-grid">
            {/* STEP 1 */}
            <article className="home-how-card">
              <div className="home-how-card-top">
                <div className="home-how-icon">
                  <Search size={19} />
                </div>
                <span className="home-how-number">01</span>
              </div>

              <h3>Find Your Doctor</h3>
              <p>
                Filter by specialty, clinic location, accepted insurance,
                or doctor name to find a certified fit for your needs.
              </p>

              <div className="home-how-note">
                <span>START WITH WHAT MATTERS</span>
                <p>Specialty · Location · Insurance network</p>
              </div>
            </article>

            {/* STEP 2 */}
            <article className="home-how-card">
              <div className="home-how-card-top">
                <div className="home-how-icon">
                  <CalendarDays size={19} />
                </div>
                <span className="home-how-number">02</span>
              </div>

              <h3>Choose Your Appointment</h3>
              <p>
                Browse open time slots live on our scheduling board.
                Pick the day and time that smoothly fits your routine.
              </p>

              <div className="home-how-note">
                <span>MAKE ROOM FOR YOUR HEALTH</span>
                <p>Instant slots · Morning or Evening</p>
              </div>
            </article>

            {/* STEP 3 */}
            <article className="home-how-card">
              <div className="home-how-card-top">
                <div className="home-how-icon home-how-icon-active">
                  <CircleCheck size={19} />
                </div>
                <span className="home-how-number">03</span>
              </div>

              <h3>Confirm Your Booking</h3>
              <p>
                Review clinic directions and receive swift digital confirmation
                along with pre-visit check-in instructions.
              </p>

              <div className="home-how-note">
                <span>KNOW WHAT COMES NEXT</span>
                <p>SMS alerts · Calendar synchronization</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
