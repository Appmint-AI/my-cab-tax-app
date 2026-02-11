import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CarFront, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Legal() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border/40 backdrop-blur-sm fixed w-full z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg text-primary-foreground">
              <CarFront className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">My Cab Tax</span>
          </div>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex-1 w-full">
        <h1 className="font-display font-bold text-3xl sm:text-4xl mb-8" data-testid="text-legal-title">Legal</h1>

        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-8">
            <TabsTrigger value="terms" data-testid="tab-terms">Terms of Service</TabsTrigger>
            <TabsTrigger value="privacy" data-testid="tab-privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="tax" data-testid="tab-tax">Tax Disclaimers</TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <Card className="p-6 sm:p-8">
              <h2 className="font-display font-bold text-2xl mb-4">Terms of Service</h2>
              <p className="text-sm text-muted-foreground mb-6">Last updated: February 2026</p>

              <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                <section>
                  <h3 className="font-semibold text-base mb-2">1. Acceptance of Terms</h3>
                  <p>By accessing or using My Cab Tax USA ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. We reserve the right to update these Terms at any time, and continued use of the Service constitutes acceptance of any changes.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2. Description of Service</h3>
                  <p>My Cab Tax USA provides tax tracking and estimation tools for rideshare and taxi drivers in the United States. The Service allows users to log income, expenses, miles driven, and platform fees, and generates estimated tax calculations based on publicly available IRS rates.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3. User Accounts</h3>
                  <p>You must create an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You agree to provide accurate and complete information during registration and to keep your account information current.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">4. Acceptable Use</h3>
                  <p>You agree not to misuse the Service, including but not limited to: attempting to gain unauthorized access to other users' data, using the Service for illegal purposes, interfering with the Service's infrastructure, or submitting false or misleading financial data.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">5. Intellectual Property</h3>
                  <p>All content, features, and functionality of the Service are owned by My Cab Tax USA and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works from any part of the Service without written permission.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">6. Limitation of Liability</h3>
                  <p>The Service is provided "as is" and "as available." My Cab Tax USA shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the preceding twelve months.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">7. Termination</h3>
                  <p>We may suspend or terminate your account at any time for violation of these Terms. You may delete your account at any time. Upon termination, your right to use the Service ceases immediately, and we may delete your data after a reasonable retention period.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">8. Governing Law</h3>
                  <p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts located in Delaware.</p>
                </section>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="p-6 sm:p-8">
              <h2 className="font-display font-bold text-2xl mb-4">Privacy Policy</h2>
              <p className="text-sm text-muted-foreground mb-6">Last updated: February 2026</p>

              <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                <section>
                  <h3 className="font-semibold text-base mb-2">1. Information We Collect</h3>
                  <p>We collect information you provide directly, including: your name, email address, and profile picture (via Auth0 authentication), as well as financial data you enter such as income records, expense records, miles driven, and platform fees. We also collect usage data such as login times and feature interactions.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2. How We Use Your Information</h3>
                  <p>Your information is used to: provide and improve the Service, calculate tax estimates, generate reports, communicate with you about your account, and comply with legal obligations. We do not sell your personal or financial data to third parties.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3. Authentication & Security</h3>
                  <p>We use Auth0 for secure authentication, supporting multi-factor authentication (MFA) and biometric login. Your password is never stored on our servers. All data is transmitted using TLS encryption. We implement industry-standard security measures to protect your financial data.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">4. Data Storage & Retention</h3>
                  <p>Your data is stored in secure PostgreSQL databases. We retain your data for as long as your account is active. You may request deletion of your data at any time by contacting us. After account deletion, your data will be permanently removed within 30 days.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">5. Third-Party Services</h3>
                  <p>We use the following third-party services: Auth0 (authentication), and cloud infrastructure providers for hosting. Each of these services has its own privacy policy. We share only the minimum data necessary for these services to function.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">6. Your Rights</h3>
                  <p>You have the right to: access your personal data, correct inaccurate data, request deletion of your data, export your data in a portable format, and opt out of non-essential communications. To exercise these rights, contact us at the email address provided below.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">7. Children's Privacy</h3>
                  <p>The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will delete it promptly.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">8. Contact Us</h3>
                  <p>If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at privacy@mycabtaxusa.com.</p>
                </section>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tax">
            <Card className="p-6 sm:p-8">
              <h2 className="font-display font-bold text-2xl mb-4">Tax Disclaimers</h2>
              <p className="text-sm text-muted-foreground mb-6">Last updated: February 2026</p>

              <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                <section>
                  <h3 className="font-semibold text-base mb-2">1. Not Tax Advice</h3>
                  <p>My Cab Tax USA is a tax tracking and estimation tool only. The Service does not provide tax advice, legal advice, or accounting services. The calculations and estimates provided by the Service are for informational purposes only and should not be relied upon as a substitute for professional tax advice.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2. IRS Rate Estimates</h3>
                  <p>The Service uses publicly available IRS standard mileage rates and self-employment tax rates for the 2026 tax year. These rates are subject to change by the IRS. The current rates used are: standard mileage rate of $0.725 per mile and self-employment tax rate of 15.3%. We make reasonable efforts to keep rates current but cannot guarantee accuracy at all times.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3. Accuracy of Calculations</h3>
                  <p>Tax calculations provided by the Service are estimates based on the data you enter. Actual tax liability may differ based on your complete financial situation, filing status, other income sources, deductions, credits, and applicable state and local taxes not accounted for by this Service.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">4. Schedule C Simplified</h3>
                  <p>The Service provides a simplified Schedule C (Profit or Loss from Business) summary. It does not account for all possible deductions, credits, depreciation methods, or business structures. Complex tax situations may require additional forms and professional guidance.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">5. Quarterly Estimated Payments</h3>
                  <p>Quarterly payment estimates are provided as a general guide. Actual quarterly estimated tax payment obligations depend on your total expected tax liability, withholding from other sources, and Safe Harbor provisions. The quarterly deadlines shown (April 15, June 15, September 15, and January 15) are general IRS deadlines and may shift if they fall on weekends or holidays.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">6. Consult a Tax Professional</h3>
                  <p>We strongly recommend consulting a qualified tax professional, CPA, or enrolled agent for personalized tax advice. My Cab Tax USA is not a substitute for professional tax preparation or filing services. You are solely responsible for the accuracy of your tax returns and compliance with all applicable tax laws.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">7. No Guarantee of Tax Savings</h3>
                  <p>Use of this Service does not guarantee any particular tax outcome, deduction amount, or tax savings. Results depend entirely on the accuracy and completeness of the data you provide.</p>
                </section>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="py-12 border-t border-border/40 mt-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} My Cab Tax USA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
