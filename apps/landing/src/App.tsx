import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  CheckCircle2,
  Users,
  BarChart3,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for merging classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={cn("navbar", isScrolled && "scrolled")}>
      <div className="container">
        <div className="nav-content">
          <div className="logo">
            <GraduationCap className="text-accent-primary" size={32} />
            <span className="text-gradient">EduSmart</span>
          </div>

          <div className="nav-links">
            <a href="#features" className="nav-link">
              Features
            </a>
            <a href="#how-it-works" className="nav-link">
              How it Works
            </a>
            <a href="/admin/login" className="nav-link">
              Login
            </a>
            <a href="/admin" className="btn btn-primary">
              Get Started
            </a>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="container">
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="hero-badge">Revolutionizing Education Management</span>
            <h1>
              Manage your <span className="text-gradient">School</span> with Intelligence
            </h1>
            <p>
              The all-in-one platform for student attendance, grading, and performance tracking.
              Streamline administrative tasks and focus on what matters: teaching.
            </p>
            <div className="flex gap-4">
              <a href="/admin" className="btn btn-primary">
                Start Free Trial <ArrowRight className="ml-2" size={18} />
              </a>
              <a href="/admin" className="btn btn-secondary">
                Book a Demo
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
  <motion.div
    className="feature-card"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="feature-icon">
      <Icon size={32} />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </motion.div>
);

const Features = () => {
  const features = [
    {
      icon: Calendar,
      title: "Smart Attendance",
      description:
        "Automated attendance tracking with real-time notifications for parents and teachers.",
      delay: 0.1,
    },
    {
      icon: BarChart3,
      title: "Advanced Grading",
      description:
        "Powerful grading system with customizable rubrics and automatic GPA calculation.",
      delay: 0.2,
    },
    {
      icon: Users,
      title: "Student Portal",
      description: "Dedicated dashboard for students to track progress, assignments, and grades.",
      delay: 0.3,
    },
    {
      icon: ShieldCheck,
      title: "Secure Data",
      description:
        "Enterprise-grade security ensuring all student and academic records are protected.",
      delay: 0.4,
    },
    {
      icon: GraduationCap,
      title: "Academic Reports",
      description: "Generate comprehensive reports and transcripts with just a few clicks.",
      delay: 0.5,
    },
    {
      icon: CheckCircle2,
      title: "Task Management",
      description: "Assign and track student tasks with automated reminders and deadline alerts.",
      delay: 0.6,
    },
  ];

  return (
    <section id="features" className="container">
      <div style={{ textAlign: "center", marginBottom: "4rem" }}>
        <h2 style={{ fontSize: "3rem", marginBottom: "1rem" }}>Everything you need</h2>
        <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
          Built for modern educational institutions looking to digitize their workflow.
        </p>
      </div>
      <div className="features-grid">
        {features.map((f, i) => (
          <FeatureCard key={i} {...f} />
        ))}
      </div>
    </section>
  );
};

const Footer = () => (
  <footer>
    <div className="container">
      <div className="footer-content">
        <div className="logo">
          <GraduationCap className="text-accent-primary" size={24} />
          <span className="text-gradient">EduSmart</span>
        </div>
        <div className="footer-links">
          <a href="#" className="nav-link">
            Privacy Policy
          </a>
          <a href="#" className="nav-link">
            Terms of Service
          </a>
          <a href="#" className="nav-link">
            Contact
          </a>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          © 2024 EduSmart. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

function App() {
  return (
    <div className="app">
      <Navbar />
      <Hero />
      <Features />

      {/* Social Proof / Numbers */}
      <section
        className="container"
        style={{ padding: "60px 0", borderTop: "1px solid var(--glass-border)" }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "2rem" }}
        >
          <div style={{ textAlign: "center" }}>
            <h4 style={{ fontSize: "2.5rem" }} className="text-gradient">
              500+
            </h4>
            <p style={{ color: "var(--text-secondary)" }}>Schools Joined</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <h4 style={{ fontSize: "2.5rem" }} className="text-gradient">
              100k+
            </h4>
            <p style={{ color: "var(--text-secondary)" }}>Active Students</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <h4 style={{ fontSize: "2.5rem" }} className="text-gradient">
              99%
            </h4>
            <p style={{ color: "var(--text-secondary)" }}>Satisfaction Rate</p>
          </div>
        </div>
      </section>

      <section style={{ background: "rgba(56, 189, 248, 0.05)", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>
            Ready to transform your school?
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "2.5rem",
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
            }}
          >
            Join hundreds of schools already using EduSmart to improve their academic efficiency.
          </p>
          <a
            href="/admin"
            className="btn btn-primary"
            style={{ padding: "1rem 2.5rem", fontSize: "1.25rem" }}
          >
            Get Started for Free
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default App;
