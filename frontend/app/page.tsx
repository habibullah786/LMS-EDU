'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isAuthenticated, isLoading, openLoginModal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/parent/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (!isLoading && isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="min-h-[90vh] bg-gradient-to-br from-primary via-blue-500 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-secondary/20 rounded-full blur-3xl"></div>
        </div>

        <div className="section-container py-20 relative z-10 flex flex-col justify-center min-h-[90vh]">
          <div className="max-w-3xl">
            <div className="mb-6 animate-slide-in">
              <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-semibold">
                🚀 Transform Your Child&apos;s Future
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-slide-in">
              Master Coding <br />
              <span className="text-accent">&amp; Robotics</span>
              <br />
              From Age 7-17
            </h1>

            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl animate-slide-in">
              Learn from expert instructors in Delhi, Bengaluru, and Kolkata. Start with a FREE trial
              class today and unlock your child&apos;s potential!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-slide-in">
              <button onClick={openLoginModal} className="btn-primary text-lg">
                Start Free Trial →
              </button>
              <a href="#courses" className="btn-outline text-lg text-center">
                Explore Courses
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-slide-in">
              <div><div className="text-4xl font-bold mb-2">5K+</div><p className="text-blue-100">Students Enrolled</p></div>
              <div><div className="text-4xl font-bold mb-2">50+</div><p className="text-blue-100">Expert Instructors</p></div>
              <div><div className="text-4xl font-bold mb-2">3</div><p className="text-blue-100">Cities Covered</p></div>
              <div><div className="text-4xl font-bold mb-2">8+</div><p className="text-blue-100">Years Experience</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose Exceed Robotics?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We provide world-class education in coding and robotics with a focus on practical skills
              and real-world projects.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { emoji: '👨‍💻', color: 'blue', title: 'Expert Instructors', desc: 'Learn from industry professionals with years of experience in teaching coding and robotics.' },
              { emoji: '🤖', color: 'orange', title: 'Hands-On Learning', desc: 'Interactive projects, robotics kits, and real-world problem-solving to build practical skills.' },
              { emoji: '🎯', color: 'yellow', title: 'Age-Appropriate', desc: 'Curriculum designed for 7-8, 9-11, and 12+ age groups with progressive complexity.' },
              { emoji: '📱', color: 'blue', title: 'Flexible Schedule', desc: 'Multiple batch timings and semesters (APR-JUN, JUL-SEP, OCT-DEC, JAN-MAR) to fit your schedule.' },
              { emoji: '🏆', color: 'orange', title: 'Certifications', desc: 'Industry-recognized certificates upon completion of each course level.' },
              { emoji: '💬', color: 'yellow', title: 'Parent Support', desc: "Regular progress reports and direct communication with instructors about your child's growth." },
            ].map(f => (
              <div key={f.title} className={`p-8 border-2 border-gray-200 rounded-2xl hover:border-primary hover:shadow-lg transition-all duration-300`}>
                <div className={`w-16 h-16 bg-${f.color}-100 rounded-xl flex items-center justify-center mb-6`}>
                  <span className="text-3xl">{f.emoji}</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-20 bg-light">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Courses</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our comprehensive curriculum designed for every age group and skill level.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Coding */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="h-64 bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                <span className="text-8xl">💻</span>
              </div>
              <div className="p-8">
                <h3 className="text-3xl font-bold mb-3">Coding</h3>
                <p className="text-gray-600 mb-6">Learn programming fundamentals, Python, web development, and more. Build real projects and apps.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex gap-3"><span className="text-primary font-bold">✓</span><span>Ages 7-8: Introduction to Programming</span></li>
                  <li className="flex gap-3"><span className="text-primary font-bold">✓</span><span>Ages 9-11: Python Basics &amp; Web Dev</span></li>
                  <li className="flex gap-3"><span className="text-primary font-bold">✓</span><span>Ages 12+: Advanced Programming</span></li>
                </ul>
                <button onClick={openLoginModal} className="btn-primary w-full text-center">Explore Coding →</button>
              </div>
            </div>

            {/* Robotics */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="h-64 bg-gradient-to-br from-secondary to-orange-600 flex items-center justify-center">
                <span className="text-8xl">🤖</span>
              </div>
              <div className="p-8">
                <h3 className="text-3xl font-bold mb-3">Robotics</h3>
                <p className="text-gray-600 mb-6">Build and program robots. Learn electronics, mechanics, and AI. Perfect for hands-on learners.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex gap-3"><span className="text-secondary font-bold">✓</span><span>Ages 7-8: Basic Robotics &amp; Building</span></li>
                  <li className="flex gap-3"><span className="text-secondary font-bold">✓</span><span>Ages 9-11: Robot Assembly &amp; Control</span></li>
                  <li className="flex gap-3"><span className="text-secondary font-bold">✓</span><span>Ages 12+: Advanced Robotics &amp; AI</span></li>
                </ul>
                <button onClick={openLoginModal} className="btn-secondary w-full text-center">Explore Robotics →</button>
              </div>
            </div>
          </div>

          {/* Trial CTA */}
          <div className="mt-16 bg-gradient-to-r from-accent/20 to-secondary/20 rounded-2xl p-10 border-2 border-accent/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h3 className="text-3xl font-bold mb-3">Ready to Start?</h3>
                <p className="text-lg text-gray-700">
                  Try your first class FREE! No credit card required.
                </p>
              </div>
              <button onClick={openLoginModal} className="btn-primary text-lg whitespace-nowrap">
                Claim Free Trial →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-dark text-white py-12">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#courses" className="hover:text-white transition">Courses</a></li>
                <li><button onClick={openLoginModal} className="hover:text-white transition">Login</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Locations</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Delhi</li><li>Bengaluru</li><li>Kolkata</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>info@exceedrobotics.com</li>
                <li>+91-XXXX-XXXX</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Follow Us</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Facebook</a></li>
                <li><a href="#" className="hover:text-white transition">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Exceed Robotics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
