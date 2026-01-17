import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUse() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-4 p-4">
          <button onClick={() => window.history.back()}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Terms of Use</h1>
        </div>
      </div>

      <div className="p-4 pb-20 max-w-2xl mx-auto">
        <div className="prose prose-sm dark:prose-invert">
          <p className="text-sm text-muted-foreground mb-6">
            Last Updated: January 2026
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Welcome to Nearly. By accessing or using our mobile application and services, you agree to be bound by these Terms of Use ("Terms"). These Terms constitute a legally binding agreement between you and Nearly Technologies Pvt. Ltd. ("Company," "we," "us," or "our"), governed by the laws of India, including the Information Technology Act, 2000, the Consumer Protection Act, 2019, and other applicable regulations.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            If you do not agree to these Terms, please do not use our services.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">2. Eligibility</h2>
          <p className="text-sm text-muted-foreground mb-4">
            By using Nearly, you represent and warrant that:
          </p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li>You are at least 18 years of age, or the age of majority in your jurisdiction</li>
            <li>You have the legal capacity to enter into a binding contract</li>
            <li>You are not barred from using services under Indian law or any other applicable jurisdiction</li>
            <li>You will comply with these Terms and all applicable laws and regulations</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">3. Account Registration</h2>
          <h3 className="text-base font-medium mt-4 mb-2">3.1 Account Creation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            To use certain features of Nearly, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">3.2 Account Security</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">3.3 One Account Per User</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Each user may maintain only one personal account. Creating multiple accounts may result in termination of all accounts.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">4. User Content</h2>
          <h3 className="text-base font-medium mt-4 mb-2">4.1 Content Ownership</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You retain ownership of any content you post, upload, or share on Nearly ("User Content"). By posting User Content, you grant us a non-exclusive, worldwide, royalty-free license to use, modify, reproduce, distribute, and display such content in connection with our services.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">4.2 Content Standards</h3>
          <p className="text-sm text-muted-foreground mb-2">You agree not to post content that:</p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li>Violates any law, including the Information Technology Act, 2000, and IT Rules, 2021</li>
            <li>Infringes intellectual property rights of others</li>
            <li>Is defamatory, obscene, pornographic, or harmful to minors</li>
            <li>Promotes hatred, violence, or discrimination based on religion, race, caste, gender, or ethnicity</li>
            <li>Contains false information or misinformation</li>
            <li>Impersonates any person or entity</li>
            <li>Contains malware, viruses, or harmful code</li>
            <li>Threatens the unity, integrity, defence, security, or sovereignty of India</li>
            <li>Is blasphemous or promotes terrorism</li>
          </ul>

          <h3 className="text-base font-medium mt-4 mb-2">4.3 Content Removal</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We reserve the right to remove any content that violates these Terms or applicable laws, including content flagged under the IT Rules, 2021 intermediary guidelines. We will respond to content takedown requests within the timeframes prescribed by law.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">5. Prohibited Activities</h2>
          <p className="text-sm text-muted-foreground mb-2">You agree not to:</p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li>Use the service for any illegal purpose</li>
            <li>Harass, bully, or threaten other users</li>
            <li>Engage in spamming or unsolicited commercial messages</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Use automated means to access the service without permission</li>
            <li>Collect user information without consent</li>
            <li>Interfere with the proper functioning of the service</li>
            <li>Circumvent any security measures</li>
            <li>Engage in any activity that violates Indian law</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">6. Intellectual Property</h2>
          <h3 className="text-base font-medium mt-4 mb-2">6.1 Our Rights</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The Nearly app, including its design, features, graphics, and content (excluding User Content), is owned by us and protected by copyright, trademark, and other intellectual property laws of India.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">6.2 Limited License</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We grant you a limited, non-exclusive, non-transferable license to use the Nearly app for personal, non-commercial purposes in accordance with these Terms.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">7. Privacy</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your use of Nearly is subject to our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your personal information in compliance with the Digital Personal Data Protection Act, 2023.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">8. Disclaimer of Warranties</h2>
          <p className="text-sm text-muted-foreground mb-4">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY INDIAN LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            We do not warrant that the service will be uninterrupted, secure, or error-free. We are not responsible for any content posted by users.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">9. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE INDIAN LAW, IN NO EVENT SHALL NEARLY, ITS DIRECTORS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Our total liability shall not exceed the amount you have paid us in the twelve (12) months preceding the claim, or INR 10,000, whichever is less.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">10. Indemnification</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You agree to indemnify and hold harmless Nearly and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the service, your User Content, or your violation of these Terms.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">11. Termination</h2>
          <h3 className="text-base font-medium mt-4 mb-2">11.1 Your Right to Terminate</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You may discontinue using Nearly at any time. You can request account closure through the app settings.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">11.2 Our Right to Terminate</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We may suspend or terminate your account if you violate these Terms, engage in fraudulent activity, or as required by law. We will provide notice where practicable.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">11.3 Effect of Termination</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upon termination, your right to use the service ceases immediately. We may retain certain data as required by law.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">12. Grievance Redressal</h2>
          <p className="text-sm text-muted-foreground mb-4">
            In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, we have established a grievance redressal mechanism:
          </p>
          <div className="bg-muted p-4 rounded-lg mb-4">
            <p className="text-sm font-medium">Grievance Officer</p>
            <p className="text-sm text-muted-foreground">Nearly Technologies Pvt. Ltd.</p>
            <p className="text-sm text-muted-foreground">Email: grievance@nearly.app</p>
            <p className="text-sm text-muted-foreground">Acknowledgment: Within 24 hours</p>
            <p className="text-sm text-muted-foreground">Resolution: Within 15 days</p>
          </div>

          <h2 className="text-lg font-semibold mt-6 mb-3">13. Compliance with Indian Law</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Nearly complies with all applicable Indian laws, including:
          </p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li>Information Technology Act, 2000 and amendments</li>
            <li>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</li>
            <li>Digital Personal Data Protection Act, 2023</li>
            <li>Consumer Protection Act, 2019</li>
            <li>Indian Penal Code provisions relating to online conduct</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">14. Dispute Resolution</h2>
          <h3 className="text-base font-medium mt-4 mb-2">14.1 Informal Resolution</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Before initiating any formal proceedings, you agree to first contact us and attempt to resolve any dispute informally for at least 30 days.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">14.2 Arbitration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Any dispute that cannot be resolved informally shall be settled by arbitration in accordance with the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted in [City], India, in English.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">14.3 Jurisdiction</h3>
          <p className="text-sm text-muted-foreground mb-4">
            For matters not subject to arbitration, you agree to submit to the exclusive jurisdiction of courts in [City], India.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">15. Changes to Terms</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We may modify these Terms at any time. We will notify you of material changes through the app or by email. Your continued use of the service after such modifications constitutes acceptance of the updated Terms.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">16. General Provisions</h2>
          <h3 className="text-base font-medium mt-4 mb-2">16.1 Entire Agreement</h3>
          <p className="text-sm text-muted-foreground mb-4">
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Nearly regarding the service.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">16.2 Severability</h3>
          <p className="text-sm text-muted-foreground mb-4">
            If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">16.3 No Waiver</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">16.4 Assignment</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You may not assign your rights under these Terms without our prior written consent. We may assign our rights to any affiliate or in connection with a business transfer.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">17. Contact Information</h2>
          <p className="text-sm text-muted-foreground mb-4">
            For any questions about these Terms, please contact us at:
          </p>
          <div className="bg-muted p-4 rounded-lg mb-4">
            <p className="text-sm font-medium">Nearly Technologies Pvt. Ltd.</p>
            <p className="text-sm text-muted-foreground">Email: legal@nearly.app</p>
            <p className="text-sm text-muted-foreground">Address: [Your Registered Address], India</p>
            <p className="text-sm text-muted-foreground">CIN: [Company Identification Number]</p>
          </div>

          <div className="mt-8 p-4 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium text-primary">Agreement</p>
            <p className="text-xs text-muted-foreground mt-1">
              By using Nearly, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
