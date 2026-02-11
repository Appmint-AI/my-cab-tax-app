import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CarFront, ArrowLeft, AlertTriangle } from "lucide-react";
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
              Back to App
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex-1 w-full">
        <h1 className="font-display font-bold text-3xl sm:text-4xl mb-6" data-testid="text-legal-title">Legal Center - My Cab Tax USA</h1>

        <Card className="p-6 sm:p-8 mb-8 border-destructive/50 bg-destructive/5" data-testid="disclaimer-box">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-lg mb-2 text-destructive">IMPORTANT: TAX DISCLAIMER</h2>
              <p className="text-sm leading-relaxed text-foreground/90">
                <strong>My Cab Tax USA is a bookkeeping tool, NOT a tax advisory service.</strong> We do not provide professional tax, legal, or accounting advice. This software is designed for informational and organizational purposes only. You should consult with a qualified CPA or Tax Attorney before filing any returns with the IRS.
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-8">
            <TabsTrigger value="terms" data-testid="tab-terms">Terms of Service</TabsTrigger>
            <TabsTrigger value="privacy" data-testid="tab-privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="tax" data-testid="tab-tax">Tax Disclaimers</TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <Card className="p-6 sm:p-8">
              <h2 className="font-display font-bold text-2xl mb-4">1. Terms of Service</h2>
              <p className="text-sm text-muted-foreground mb-6">Last updated: February 2026</p>

              <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                <section>
                  <h3 className="font-semibold text-base mb-2">1.1 Acceptance of Terms</h3>
                  <p>By accessing or using My Cab Tax USA ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. We reserve the right to update these Terms at any time, and continued use of the Service constitutes acceptance of any changes.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">1.2 Description of Service</h3>
                  <p>My Cab Tax USA provides tax tracking and estimation tools for rideshare and taxi drivers in the United States. The Service allows users to log income, expenses, miles driven, and platform fees, and generates estimated tax calculations based on publicly available IRS rates. By using My Cab Tax USA, you agree that we are not liable for any IRS audits, penalties, or interest resulting from your use of this app. Accuracy of data entry is the sole responsibility of the driver.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">1.3 User Accounts</h3>
                  <p>You must create an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You agree to provide accurate and complete information during registration and to keep your account information current.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">1.4 Acceptable Use</h3>
                  <p>You agree not to misuse the Service, including but not limited to: attempting to gain unauthorized access to other users' data, using the Service for illegal purposes, interfering with the Service's infrastructure, or submitting false or misleading financial data.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">1.5 Intellectual Property</h3>
                  <p>All content, features, and functionality of the Service are owned by My Cab Tax USA and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works from any part of the Service without written permission.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">1.6 Mandatory Arbitration</h3>
                  <p>Any disputes arising out of or relating to these Terms or the Service will be resolved through individual binding arbitration in the United States. You waive your right to participate in a class-action lawsuit or class-wide arbitration. This arbitration clause survives termination of your account.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">1.7 Termination</h3>
                  <p>We may suspend or terminate your account at any time for violation of these Terms. You may delete your account at any time. Upon termination, your right to use the Service ceases immediately, and we may delete your data after a reasonable retention period.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">1.8 Governing Law</h3>
                  <p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.</p>
                </section>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="p-6 sm:p-8">
              <h2 className="font-display font-bold text-2xl mb-4">2. Privacy Policy (GLBA & CCPA Compliant)</h2>
              <p className="text-sm text-muted-foreground mb-6">Last updated: February 2026</p>

              <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                <section>
                  <h3 className="font-semibold text-base mb-2">2.1 Information We Collect</h3>
                  <p>We collect information you provide directly, including: your name, email address, and profile picture (via Auth0 authentication), as well as financial data you enter such as income records, expense records, miles driven, and platform fees. We collect financial data and mileage logs to provide our services. We also collect usage data such as login times and feature interactions.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2.2 How We Use Your Information</h3>
                  <p>Your information is used to: provide and improve the Service, calculate tax estimates, generate reports, communicate with you about your account, and comply with legal obligations. We do not sell your personal financial data to third parties.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2.3 Data Protection & Encryption</h3>
                  <p>We use industry-standard encryption to protect your financial information. We use Auth0 for secure authentication, supporting multi-factor authentication (MFA) and biometric login. Your password is never stored on our servers. All data is transmitted using TLS encryption. We implement industry-standard security measures to protect your financial data, including any Social Security Numbers (SSN) and bank information if provided.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2.4 Data Storage & Retention</h3>
                  <p>Your data is stored in secure PostgreSQL databases hosted on encrypted cloud infrastructure. We retain your data for as long as your account is active. You may request deletion of your data at any time by contacting us. After account deletion, your data will be permanently removed within 30 days.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2.5 Third-Party Services</h3>
                  <p>We use the following third-party services: Auth0 (authentication), and cloud infrastructure providers for hosting. Each of these services has its own privacy policy. We share only the minimum data necessary for these services to function.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2.6 Your Rights (CCPA)</h3>
                  <p>If you are a California resident, you have the right under the California Consumer Privacy Act (CCPA) to: know what personal data is collected about you, request deletion of your personal data, opt out of the sale of your data (we do not sell data), and not be discriminated against for exercising your rights. You also have the right to access your data, correct inaccurate data, and export your data in a portable format. To exercise these rights, contact us at privacy@mycabtaxusa.com.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2.7 Children's Privacy</h3>
                  <p>The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will delete it promptly.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">2.8 Contact Us</h3>
                  <p>If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at privacy@mycabtaxusa.com.</p>
                </section>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tax">
            <Card className="p-6 sm:p-8">
              <h2 className="font-display font-bold text-2xl mb-4">3. Limitation of Liability & Tax Disclaimers</h2>
              <p className="text-sm text-muted-foreground mb-6">Last updated: February 2026</p>

              <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
                <section>
                  <h3 className="font-semibold text-base mb-2">3.1 Not Tax Advice</h3>
                  <p>My Cab Tax USA is a bookkeeping tool, NOT a tax advisory service. The Service does not provide tax advice, legal advice, or accounting services. The calculations and estimates provided by the Service are for informational and organizational purposes only and should not be relied upon as a substitute for professional tax advice. You should consult with a qualified CPA or Tax Attorney before filing any returns with the IRS.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3.2 Limitation of Liability</h3>
                  <p>The Service is provided "as is" and "as available." To the maximum extent permitted by law, My Cab Tax USA's total liability shall not exceed the amount paid by the user for the service in the last 12 months, or $100, whichever is less. My Cab Tax USA shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to IRS audits, penalties, interest, or any tax-related consequences.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3.3 IRS Rate Estimates</h3>
                  <p>The Service uses publicly available IRS standard mileage rates and self-employment tax rates for the 2026 tax year. These rates are subject to change by the IRS. The current rates used are: standard mileage rate of $0.725 per mile and self-employment tax rate of 15.3%. We make reasonable efforts to keep rates current but cannot guarantee accuracy at all times.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3.4 Accuracy of Calculations</h3>
                  <p>Tax calculations provided by the Service are estimates based on the data you enter. Accuracy of data entry is the sole responsibility of the driver. Actual tax liability may differ based on your complete financial situation, filing status, other income sources, deductions, credits, and applicable state and local taxes not accounted for by this Service.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3.5 Schedule C Simplified</h3>
                  <p>The Service provides a simplified Schedule C (Profit or Loss from Business) summary. It does not account for all possible deductions, credits, depreciation methods, or business structures. Complex tax situations may require additional forms and professional guidance.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3.6 Quarterly Estimated Payments</h3>
                  <p>Quarterly payment estimates are provided as a general guide. Actual quarterly estimated tax payment obligations depend on your total expected tax liability, withholding from other sources, and Safe Harbor provisions. The quarterly deadlines shown (April 15, June 15, September 15, and January 15) are general IRS deadlines and may shift if they fall on weekends or holidays.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3.7 Consult a Tax Professional</h3>
                  <p>We strongly recommend consulting a qualified tax professional, CPA, enrolled agent, or Tax Attorney for personalized tax advice. My Cab Tax USA is not a substitute for professional tax preparation or filing services. You are solely responsible for the accuracy of your tax returns and compliance with all applicable tax laws.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-base mb-2">3.8 No Guarantee of Tax Savings</h3>
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
