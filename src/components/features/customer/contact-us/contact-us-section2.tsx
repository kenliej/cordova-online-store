import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    category: "Ordering & Pick Up",
    question: "How does the Pay & Claim at the Mall system work?",
    answer: "You browse and order items online to check real-time store availability and skip long waiting lines. Once your order is prepared by our mall workers, you will receive a notification. Simply visit the store at the mall, pay at the counter, and claim your items."
  },
  {
    category: "Policies & Bans",
    question: "What happens if I fail to claim my order?",
    answer: "You have up to 3 days to claim your order once it is marked as 'Ready to Claim'. If you do not claim it within 3 days, the order will automatically be marked as 'Didn't Claimed', resulting in 1 bad record. Please note: If you accumulate 2 bad records (unclaimed orders), your account will be automatically banned."
  },
  {
    category: "Ordering & Pick Up",
    question: "Can I cancel my order after placing it?",
    answer: "Yes, you can cancel your order while its status is still 'Pending'. Once our workers start gathering your items and update the status to 'Ready to Claim', cancellations are no longer allowed."
  },
  {
    category: "Account & Verification",
    question: "Why do I need to provide 2 valid IDs and a photo to register?",
    answer: "To ensure a secure shopping experience and prevent fraudulent transactions, all customer accounts require verification (18+ years old, face photo, and 2 valid IDs). Mall workers will review your submission before activating your account."
  },
  {
    category: "Account & Verification",
    question: "Can I change my name or birthday after registration?",
    answer: "For security and verification purposes, users cannot change their legal name or birthday once registered. You can only update your email address, phone number, and delivery/home address in your profile settings."
  },
  {
    category: "Payments & Pricing",
    question: "What payment methods are accepted at the mall?",
    answer: "We operate strictly on a 'Pay at the Mall' policy. There is no online delivery payment. You pay directly at the respective store counter using cash or accepted in-store payment options when you pick up your items."
  }
];

export function ContactUsSection2() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-white w-full py-14 px-4 sm:px-6 lg:px-12 font-sans border-t border-gray-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Section Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-sky-50 text-[#3087C5] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-sky-100 shadow-2xs">
            <HelpCircle className="w-4 h-4" />
            <span>Help & Support Center</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm font-semibold text-gray-600 max-w-xl mx-auto">
            Find answers to common questions about online ordering, store pick-ups, mall policies, and account guidelines.
          </p>
        </div>

        {/* Important Warning Banner for Unclaimed Orders Policy */}
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start space-x-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-amber-900 text-sm uppercase tracking-wide">
              Important Notice: 3-Day Claim Policy & Account Ban
            </h4>
            <p className="text-xs font-semibold text-amber-800 leading-relaxed">
              Orders must be claimed within <span className="font-black underline">3 days</span> of becoming ready. Failing to claim 2 orders results in 2 bad records and will cause your account to be permanently <span className="font-black uppercase text-red-700">banned</span>. Please review your schedule before placing items on hold.
            </p>
          </div>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index}
                className={`border rounded-2xl transition-all overflow-hidden ${
                  isOpen ? "border-[#3087C5] bg-[#EBE9E1]/20 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {/* Question Header */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                >
                  <div className="flex items-center space-x-3 pr-4">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-100 text-[#3087C5] shrink-0">
                      {faq.category}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                      {faq.question}
                    </h3>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? "bg-[#3087C5] text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Answer Content */}
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm font-medium text-gray-700 leading-relaxed border-t border-gray-200/60 bg-white/60">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}