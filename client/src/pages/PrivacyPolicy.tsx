import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-4 p-4">
          <button onClick={() => window.history.back()}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Privacy Policy</h1>
        </div>
      </div>

      <div className="p-4 pb-20 max-w-2xl mx-auto">
        <div className="prose prose-sm dark:prose-invert">
          <p className="text-sm text-muted-foreground mb-6">
            Last Updated: January 2026
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">1. Introduction</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Welcome to Nearly ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services. This policy is compliant with the Information Technology Act, 2000, Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023 of India.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">2. Information We Collect</h2>
          
          <h3 className="text-base font-medium mt-4 mb-2">2.1 Personal Information</h3>
          <p className="text-sm text-muted-foreground mb-2">We collect the following personal information:</p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li>Name and username</li>
            <li>Email address</li>
            <li>Phone number (optional)</li>
            <li>Profile picture</li>
            <li>Date of birth (optional)</li>
            <li>Location information (optional)</li>
            <li>Bio and interests</li>
          </ul>

          <h3 className="text-base font-medium mt-4 mb-2">2.2 Sensitive Personal Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We may collect sensitive personal data such as passwords (stored in encrypted form) and financial information for transactions, as defined under the IT Rules, 2011. Such data is collected only with your explicit consent.
          </p>

          <h3 className="text-base font-medium mt-4 mb-2">2.3 Usage Information</h3>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li>Device information (type, operating system, unique identifiers)</li>
            <li>Log information (access times, pages viewed, IP address)</li>
            <li>Information about your interactions with other users</li>
            <li>Content you create, share, or engage with</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">3. Legal Basis for Processing (Under DPDP Act, 2023)</h2>
          <p className="text-sm text-muted-foreground mb-2">We process your personal data based on:</p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li><strong>Consent:</strong> For creating an account and using our services</li>
            <li><strong>Legitimate Uses:</strong> As specified under the DPDP Act for providing services</li>
            <li><strong>Legal Obligation:</strong> When required by Indian law</li>
            <li><strong>Vital Interests:</strong> In emergency situations</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">4. How We Use Your Information</h2>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li>To provide and maintain our services</li>
            <li>To personalize your experience</li>
            <li>To communicate with you about updates and changes</li>
            <li>To enable user interactions (following, messaging, etc.)</li>
            <li>To ensure safety and security of our platform</li>
            <li>To comply with legal obligations</li>
            <li>To improve our services through analytics</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">5. Data Sharing and Disclosure</h2>
          <p className="text-sm text-muted-foreground mb-2">We may share your information with:</p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li><strong>Other Users:</strong> Profile information, posts, and interactions as per your privacy settings</li>
            <li><strong>Service Providers:</strong> Third parties who assist in operating our services (cloud hosting, analytics)</li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or government authority in India</li>
            <li><strong>Business Transfers:</strong> In connection with merger, acquisition, or sale of assets</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">6. Data Storage and Security</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We implement appropriate security measures as required under the IT Rules, 2011, including encryption, access controls, and secure data centers. Your data is primarily stored on servers located in India. If data is transferred outside India, we ensure adequate protection as per applicable laws.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">7. Your Rights (Under DPDP Act, 2023)</h2>
          <p className="text-sm text-muted-foreground mb-2">You have the right to:</p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Request information about your personal data we process</li>
            <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
            <li><strong>Erasure:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
            <li><strong>Grievance Redressal:</strong> File complaints regarding data processing</li>
            <li><strong>Nomination:</strong> Nominate another person to exercise your rights</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6 mb-3">8. Data Retention</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We retain your personal data only as long as necessary for the purposes set out in this policy, or as required by law. Upon account deletion request, we will delete your data within 90 days, except where retention is required by law.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">9. Children's Privacy</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Our services are not intended for individuals under 18 years of age. As per DPDP Act, 2023, we do not knowingly collect personal data from children without verifiable parental consent. If you are a parent and believe your child has provided us with personal data, please contact us.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">10. Cookies and Tracking</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through your browser settings. Essential cookies necessary for app functionality cannot be disabled.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">11. Third-Party Links</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Our app may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">12. Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any material changes through the app or via email. Your continued use of the app after such modifications constitutes acceptance of the updated policy.
          </p>

          <h2 className="text-lg font-semibold mt-6 mb-3">13. Grievance Officer</h2>
          <p className="text-sm text-muted-foreground mb-4">
            In accordance with the Information Technology Act, 2000 and DPDP Act, 2023, we have appointed a Grievance Officer to address your concerns:
          </p>
          <div className="bg-muted p-4 rounded-lg mb-4">
            <p className="text-sm font-medium">Grievance Officer</p>
            <p className="text-sm text-muted-foreground">Nearly Technologies Pvt. Ltd.</p>
            <p className="text-sm text-muted-foreground">Email: grievance@nearly.app</p>
            <p className="text-sm text-muted-foreground">Response Time: Within 24 hours of receipt</p>
            <p className="text-sm text-muted-foreground">Resolution Time: Within 15 days</p>
          </div>

          <h2 className="text-lg font-semibold mt-6 mb-3">14. Contact Us</h2>
          <p className="text-sm text-muted-foreground mb-4">
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <div className="bg-muted p-4 rounded-lg mb-4">
            <p className="text-sm font-medium">Nearly Technologies Pvt. Ltd.</p>
            <p className="text-sm text-muted-foreground">Email: privacy@nearly.app</p>
            <p className="text-sm text-muted-foreground">Address: [Your Registered Address], India</p>
          </div>

          <h2 className="text-lg font-semibold mt-6 mb-3">15. Governing Law</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This Privacy Policy shall be governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with this Policy shall be subject to the exclusive jurisdiction of the courts in [City], India.
          </p>

          <div className="mt-8 p-4 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium text-primary">Your Privacy Matters</p>
            <p className="text-xs text-muted-foreground mt-1">
              By using Nearly, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
