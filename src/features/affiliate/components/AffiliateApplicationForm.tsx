// =====================================================
// FINOTAUR AFFILIATE APPLICATION FORM - FIXED
// =====================================================
// Place in: src/features/affiliate/components/AffiliateApplicationForm.tsx
// 
// FIXES:
// - Ensures email and full_name are required in form submission
// - Added requested_code field for custom affiliate codes
// =====================================================

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSubmitAffiliateApplication, useAffiliateApplication } from "../hooks/useAffiliate";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { AffiliateApplicationSubmission } from "../types/affiliate.types";

// ============================================
// FORM SCHEMA
// ============================================

const applicationSchema = z.object({
  // Step 1: Basic Info - REQUIRED fields
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  country: z.string().min(1, "Please select a country"),
  
  // Step 2: Social Presence
  instagram_handle: z.string().optional(),
  youtube_channel: z.string().optional(),
  tiktok_handle: z.string().optional(),
  twitter_handle: z.string().optional(),
  website_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  total_followers: z.number().min(0).optional(),
  primary_audience: z.string().optional(),
  
  // Step 3: Marketing Plan
  requested_code: z.string()
    .max(15, "Code must be 15 characters or less")
    .regex(/^[A-Z0-9]*$/, "Only letters and numbers allowed")
    .optional()
    .or(z.literal("")),
  promotion_plan: z.string().min(20, "Please describe your promotion plan (at least 20 characters)"),
  expected_monthly_referrals: z.number().min(0).optional(),
  referral_source: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

// ============================================
// COUNTRIES LIST
// ============================================

const COUNTRIES = [
  "Israel", "United States", "United Kingdom", "Germany", "France", 
  "Canada", "Australia", "Netherlands", "Spain", "Italy",
  "Brazil", "Mexico", "Japan", "South Korea", "India",
  "Singapore", "Hong Kong", "Switzerland", "Sweden", "Norway",
  "Other"
];

// ============================================
// COMPONENT
// ============================================

interface AffiliateApplicationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export default function AffiliateApplicationForm({ 
  onSuccess, 
  onCancel,
  compact = false 
}: AffiliateApplicationFormProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  const { data: existingApplication, isLoading: checkingApplication } = useAffiliateApplication();
  const submitApplication = useSubmitAffiliateApplication();

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      email: user?.email || "",
      full_name: "",
      phone: "",
      country: "",
      instagram_handle: "",
      youtube_channel: "",
      tiktok_handle: "",
      twitter_handle: "",
      website_url: "",
      total_followers: 0,
      primary_audience: "",
      requested_code: "",
      promotion_plan: "",
      expected_monthly_referrals: 0,
      referral_source: "",
    },
  });

  // Auto-fill email from user
  useEffect(() => {
    if (user?.email) {
      form.setValue("email", user.email);
    }
  }, [user, form]);

  // Handle requested code input - uppercase and filter
  const handleRequestedCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    form.setValue("requested_code", value);
  };

  const onSubmit = async (data: ApplicationFormData) => {
    try {
      // 🔥 FIX: Ensure email and full_name are always present (they're required in schema)
      const submissionData: AffiliateApplicationSubmission = {
        email: data.email, // Required - validated by schema
        full_name: data.full_name, // Required - validated by schema
        phone: data.phone || undefined,
        country: data.country,
        instagram_handle: data.instagram_handle || undefined,
        youtube_channel: data.youtube_channel || undefined,
        tiktok_handle: data.tiktok_handle || undefined,
        twitter_handle: data.twitter_handle || undefined,
        website_url: data.website_url || undefined,
        total_followers: data.total_followers || 0,
        primary_audience: data.primary_audience || undefined,
        requested_code: data.requested_code?.toUpperCase() || undefined,
        promotion_plan: data.promotion_plan,
        expected_monthly_referrals: data.expected_monthly_referrals || 0,
        referral_source: data.referral_source || undefined,
      };

      await submitApplication.mutateAsync(submissionData);
      
      toast.success("Application submitted!", {
        description: "We'll review your application within 24-48 hours."
      });
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Application error:", error);
      toast.error(error.message || "Failed to submit application");
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getFieldsForStep = (step: number): (keyof ApplicationFormData)[] => {
    switch (step) {
      case 1: return ["email", "full_name", "country"];
      case 2: return [];
      case 3: return ["promotion_plan"];
      default: return [];
    }
  };

  // Loading state
  if (checkingApplication) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  // Already applied
  if (existingApplication) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-yellow-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Application Submitted!</h3>
        <p className="text-zinc-400 mb-4">
          Your application is currently <span className="text-yellow-500 font-medium">{existingApplication.status}</span>.
        </p>
        {existingApplication.requested_code && (
          <p className="text-sm text-zinc-500">
            Requested code: <span className="font-mono text-yellow-500">FINOTAUR-{existingApplication.requested_code}</span>
          </p>
        )}
        <p className="text-sm text-zinc-500 mt-4">
          We'll notify you via email once it's reviewed (usually within 24-48 hours).
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "max-w-2xl mx-auto"}>
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step === currentStep 
                ? "bg-yellow-500 text-black" 
                : step < currentStep 
                  ? "bg-yellow-500/20 text-yellow-500" 
                  : "bg-zinc-800 text-zinc-500"
            }`}>
              {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-0.5 mx-1 ${
                step < currentStep ? "bg-yellow-500/50" : "bg-zinc-800"
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <p className="text-sm text-zinc-400">Tell us about yourself</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="your@email.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    {...form.register("full_name")}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="John Doe"
                  />
                  {form.formState.errors.full_name && (
                    <p className="text-red-400 text-sm mt-1">{form.formState.errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select 
                    value={form.watch("country")} 
                    onValueChange={(value) => form.setValue("country", value)}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.country && (
                    <p className="text-red-400 text-sm mt-1">{form.formState.errors.country.message}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Social Presence */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Social Presence</h3>
                <p className="text-sm text-zinc-400">Share your platforms (optional but helpful)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instagram_handle" className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram_handle"
                    {...form.register("instagram_handle")}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="@username"
                  />
                </div>

                <div>
                  <Label htmlFor="youtube_channel" className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-500" />
                    YouTube
                  </Label>
                  <Input
                    id="youtube_channel"
                    {...form.register("youtube_channel")}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="Channel URL"
                  />
                </div>

                <div>
                  <Label htmlFor="tiktok_handle">TikTok</Label>
                  <Input
                    id="tiktok_handle"
                    {...form.register("tiktok_handle")}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="@username"
                  />
                </div>

                <div>
                  <Label htmlFor="twitter_handle" className="flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-sky-500" />
                    Twitter/X
                  </Label>
                  <Input
                    id="twitter_handle"
                    {...form.register("twitter_handle")}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website_url" className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Website
                </Label>
                <Input
                  id="website_url"
                  {...form.register("website_url")}
                  className="bg-zinc-800/50 border-zinc-700"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_followers">Total Followers</Label>
                  <Input
                    id="total_followers"
                    type="number"
                    {...form.register("total_followers", { valueAsNumber: true })}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <Label htmlFor="primary_audience">Primary Audience</Label>
                  <Input
                    id="primary_audience"
                    {...form.register("primary_audience")}
                    className="bg-zinc-800/50 border-zinc-700"
                    placeholder="Forex traders, Crypto..."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Marketing Plan */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Marketing Plan</h3>
                <p className="text-sm text-zinc-400">How will you promote Finotaur?</p>
              </div>

              {/* Custom Code Request */}
              <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <Label htmlFor="requested_code" className="flex items-center gap-2 text-yellow-500">
                  <Sparkles className="w-4 h-4" />
                  Request Your Custom Code (Optional)
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-zinc-500 font-mono text-sm">FINOTAUR-</span>
                  <Input
                    id="requested_code"
                    value={form.watch("requested_code") || ""}
                    onChange={handleRequestedCodeChange}
                    className="bg-zinc-800/50 border-zinc-700 uppercase font-mono"
                    placeholder="YOURCODE"
                    maxLength={15}
                  />
                </div>
                {form.watch("requested_code") && (
                  <p className="text-xs text-yellow-500/70 mt-2">
                    Your code will be: <span className="font-mono font-bold">FINOTAUR-{form.watch("requested_code")}</span>
                  </p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Leave empty for auto-generated. We'll try to honor your request if available.
                </p>
                {form.formState.errors.requested_code && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.requested_code.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="promotion_plan">How will you promote Finotaur? *</Label>
                <Textarea
                  id="promotion_plan"
                  {...form.register("promotion_plan")}
                  className="bg-zinc-800/50 border-zinc-700 min-h-[120px]"
                  placeholder="Describe your marketing strategy... (e.g., YouTube tutorials, Instagram posts, blog articles, Discord community)"
                />
                {form.formState.errors.promotion_plan && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.promotion_plan.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="expected_monthly_referrals">Expected Monthly Referrals</Label>
                <Input
                  id="expected_monthly_referrals"
                  type="number"
                  {...form.register("expected_monthly_referrals", { valueAsNumber: true })}
                  className="bg-zinc-800/50 border-zinc-700"
                  placeholder="10"
                />
              </div>

              <div>
                <Label htmlFor="referral_source">How did you hear about our affiliate program?</Label>
                <Select 
                  value={form.watch("referral_source")} 
                  onValueChange={(value) => form.setValue("referral_source", value)}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="search">Search Engine</SelectItem>
                    <SelectItem value="friend">Friend/Referral</SelectItem>
                    <SelectItem value="blog">Blog/Article</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4 pt-4">
          <div>
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="border-zinc-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-zinc-700"
              >
                Cancel
              </Button>
            ) : null}
          </div>

          <div>
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitApplication.isPending}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold"
              >
                {submitApplication.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}