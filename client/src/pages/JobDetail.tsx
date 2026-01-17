import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  Wallet,
  Building2,
  GraduationCap,
  Users,
  CheckCircle2,
  Share2,
  Bookmark,
  BookmarkCheck,
  Send,
  Globe,
  Mail,
  ChevronRight
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";


export default function JobDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/job/:id");
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const jobId = params?.id || "1";

  const { data: apiJob, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.getJob(jobId),
  });

  // Enrich API data with defaults for fields that might be missing
  const job = apiJob ? {
    ...apiJob,
    companyLogo: apiJob.companyLogo || `https://api.dicebear.com/7.x/shapes/svg?seed=${apiJob.company}`,
    companyDescription: apiJob.companyDescription || `${apiJob.company} is a growing company.`,
    locationType: apiJob.locationType || 'On-site',
    experience: apiJob.experience || 'Not specified',
    postedDays: Math.floor((Date.now() - new Date(apiJob.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)),
    applicants: apiJob.applicantsCount || 0,
    isHot: apiJob.isUrgent || false,
    responsibilities: apiJob.responsibilities || [],
    requirements: apiJob.requirements || [],
    benefits: apiJob.benefits || [],
    skills: apiJob.skills || [],
    companyWebsite: apiJob.companyWebsite || '',
    companyEmail: apiJob.companyEmail || '',
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Job not found</p>
          <Button onClick={() => setLocation("/discover")}>Back to Discover</Button>
        </div>
      </div>
    );
  }

  const handleApply = async () => {
    setIsApplying(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({
      title: "Application Submitted!",
      description: `Your application for ${job.title} has been sent.`,
    });
    setIsApplying(false);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from saved" : "Job saved!",
      description: isSaved ? "Job removed from your saved list." : "You can find this job in your saved items.",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job.title,
        text: `Check out this job: ${job.title} at ${job.company}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      try {
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "Job link copied to clipboard.",
        });
      } catch {
        toast({
          title: "Share this job",
          description: window.location.href,
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
          <button 
            onClick={() => setLocation("/discover")}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Job Details</h1>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleShare}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSave}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              {isSaved ? (
                <BookmarkCheck className="w-5 h-5 text-primary fill-primary" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Company Header */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-4">
            <Avatar className="w-16 h-16 rounded-xl">
              <AvatarImage src={job.companyLogo} />
              <AvatarFallback className="rounded-xl bg-muted text-xl">
                {job.company[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold">{job.title}</h1>
                  <p className="text-primary font-medium">{job.company}</p>
                </div>
                {job.isHot && (
                  <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                    🔥 Hot
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {job.location}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Briefcase className="w-3 h-3 mr-1" />
              {job.type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <GraduationCap className="w-3 h-3 mr-1" />
              {job.experience}
            </Badge>
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
              <Wallet className="w-3 h-3 mr-1" />
              {job.salary}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Posted {job.postedDays} days ago
            </span>
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {job.applicants} applicants
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">About the Role</h2>
          <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
            {job.description}
          </p>
        </div>

        {/* Responsibilities */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Responsibilities</h2>
          <ul className="space-y-2">
            {job.responsibilities.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Requirements */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Requirements</h2>
          <ul className="space-y-2">
            {job.requirements.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Skills */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill: string, i: number) => (
              <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Benefits & Perks</h2>
          <div className="grid grid-cols-2 gap-2">
            {job.benefits.map((benefit: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-card p-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {/* About Company */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">About {job.company}</h2>
          <p className="text-sm text-muted-foreground mb-3">{job.companyDescription}</p>
          <div className="space-y-2">
            <a 
              href={`https://${job.companyWebsite}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary"
            >
              <Globe className="w-4 h-4" />
              {job.companyWebsite}
            </a>
            <a 
              href={`mailto:${job.companyEmail}`}
              className="flex items-center gap-2 text-sm text-primary"
            >
              <Mail className="w-4 h-4" />
              {job.companyEmail}
            </a>
          </div>
        </div>
      </div>

      {/* Fixed Apply Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-md mx-auto">
          <Button 
            onClick={handleApply}
            disabled={isApplying}
            className="w-full h-12 bg-gradient-to-r from-primary to-red-500"
          >
            {isApplying ? (
              "Submitting..."
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Apply Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

