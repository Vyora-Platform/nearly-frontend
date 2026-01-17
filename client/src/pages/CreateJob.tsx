import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Briefcase, 
  Building2, 
  MapPin, 
  Wallet,
  Clock,
  Users,
  GraduationCap,
  CheckCircle2,
  Plus,
  X,
  Globe,
  Mail,
  Camera,
  Code,
  Zap
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const jobTypes = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"];
const locationTypes = ["On-site", "Remote", "Hybrid"];
const experienceLevels = ["Entry Level", "1-3 years", "3-5 years", "5-10 years", "10+ years"];
const jobCategories = [
  "Technology", "Design", "Marketing", "Finance", "Healthcare", 
  "Education", "Legal", "Sales", "Operations", "HR", "Other"
];

export default function CreateJob() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    // Basic Info
    title: "",
    company: "",
    companyLogo: "",
    companyDescription: "",
    companyWebsite: "",
    companyEmail: "",
    
    // Location
    location: "",
    locationType: "On-site",
    
    // Salary
    salaryMin: "",
    salaryMax: "",
    
    // Job Details
    type: "Full-time",
    experience: "Entry Level",
    category: "Technology",
    isHot: false,
    
    // Description
    description: "",
    
    // Lists
    responsibilities: [] as string[],
    requirements: [] as string[],
    benefits: [] as string[],
    skills: [] as string[],
  });
  
  const [newResponsibility, setNewResponsibility] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [newSkill, setNewSkill] = useState("");
  
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  
  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: (jobData: any) => api.createJob(jobData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover-jobs'] });
      toast({
        title: "Job Posted!",
        description: "Your job listing is now live.",
      });
      setLocation("/discover");
    },
    onError: (error) => {
      console.error('Failed to create job:', error);
      toast({
        title: "Error",
        description: "Failed to post job. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, companyLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // List management functions
  const addToList = (list: 'responsibilities' | 'requirements' | 'benefits' | 'skills', value: string, setValue: (v: string) => void) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [list]: [...prev[list], value.trim()]
      }));
      setValue("");
    }
  };

  const removeFromList = (list: 'responsibilities' | 'requirements' | 'benefits' | 'skills', index: number) => {
    setFormData(prev => ({
      ...prev,
      [list]: prev[list].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.company || !formData.location || !formData.description) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Build salary string
    const salaryRange = formData.salaryMin && formData.salaryMax 
      ? `${formData.salaryMin} - ${formData.salaryMax} LPA`
      : formData.salaryMin ? `${formData.salaryMin}+ LPA` 
      : formData.salaryMax ? `Up to ${formData.salaryMax} LPA`
      : 'Competitive';

    const jobData = {
      title: formData.title,
      company: formData.company,
      companyLogo: formData.companyLogo || undefined,
      companyDescription: formData.companyDescription || undefined,
      companyWebsite: formData.companyWebsite || undefined,
      companyEmail: formData.companyEmail || undefined,
      location: formData.location,
      locationType: formData.locationType,
      salary: salaryRange,
      type: formData.type,
      experience: formData.experience,
      category: formData.category,
      isHot: formData.isHot,
      description: formData.description,
      responsibilities: formData.responsibilities,
      requirements: formData.requirements,
      benefits: formData.benefits,
      skills: formData.skills,
      userId: currentUserId,
      postedAt: new Date().toISOString(),
    };

    createJobMutation.mutate(jobData);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-md mx-auto flex items-center h-14 px-4">
          <button 
            onClick={() => setLocation("/discover")}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2">Post a Job</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Company Logo */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Company Logo</label>
          <input
            type="file"
            ref={logoInputRef}
            onChange={handleLogoSelect}
            accept="image/*"
            className="hidden"
          />
          <div className="flex items-center gap-4">
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="cursor-pointer"
            >
              <Avatar className="w-20 h-20 border-2 border-dashed border-border hover:border-primary transition-colors">
                <AvatarImage src={formData.companyLogo} />
                <AvatarFallback className="bg-muted">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Upload company logo</p>
              <p className="text-xs">Recommended: 200x200px</p>
            </div>
          </div>
        </div>

        {/* Job Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Job Title *
          </label>
          <Input
            placeholder="e.g., Senior React Developer"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Company Name *
          </label>
          <Input
            placeholder="e.g., TechStartup India"
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
          />
        </div>

        {/* Company Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">About the Company</label>
          <Textarea
            placeholder="Brief description about your company..."
            value={formData.companyDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, companyDescription: e.target.value }))}
            rows={3}
          />
        </div>

        {/* Company Contact */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Website
            </label>
            <Input
              placeholder="www.company.com"
              value={formData.companyWebsite}
              onChange={(e) => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Email
            </label>
            <Input
              type="email"
              placeholder="careers@company.com"
              value={formData.companyEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, companyEmail: e.target.value }))}
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Location *
          </label>
          <Input
            placeholder="e.g., Delhi NCR, Mumbai"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          />
        </div>

        {/* Location Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Work Type</label>
          <div className="flex flex-wrap gap-2">
            {locationTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFormData(prev => ({ ...prev, locationType: type }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  formData.locationType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Salary Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Salary Range (LPA)
          </label>
          <div className="flex gap-3">
            <Input
              placeholder="Min (e.g., 10)"
              type="number"
              value={formData.salaryMin}
              onChange={(e) => setFormData(prev => ({ ...prev, salaryMin: e.target.value }))}
            />
            <span className="flex items-center text-muted-foreground">to</span>
            <Input
              placeholder="Max (e.g., 20)"
              type="number"
              value={formData.salaryMax}
              onChange={(e) => setFormData(prev => ({ ...prev, salaryMax: e.target.value }))}
            />
          </div>
        </div>

        {/* Job Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Job Type
          </label>
          <div className="flex flex-wrap gap-2">
            {jobTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFormData(prev => ({ ...prev, type }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  formData.type === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            Experience Required
          </label>
          <div className="flex flex-wrap gap-2">
            {experienceLevels.map((level) => (
              <button
                key={level}
                onClick={() => setFormData(prev => ({ ...prev, experience: level }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  formData.experience === level
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {jobCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  formData.category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Mark as Hot */}
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-medium">Mark as Hot Job</p>
              <p className="text-xs text-muted-foreground">Highlight this job listing</p>
            </div>
          </div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, isHot: !prev.isHot }))}
            className={`w-12 h-7 rounded-full transition-colors ${
              formData.isHot ? "bg-primary" : "bg-muted"
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              formData.isHot ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Job Description *</label>
          <Textarea
            placeholder="Describe the role, what you're looking for, and what the candidate will do..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={5}
          />
        </div>

        {/* Responsibilities */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Responsibilities</label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a responsibility"
              value={newResponsibility}
              onChange={(e) => setNewResponsibility(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addToList('responsibilities', newResponsibility, setNewResponsibility))}
            />
            <Button onClick={() => addToList('responsibilities', newResponsibility, setNewResponsibility)} size="icon" variant="secondary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 mt-2">
            {formData.responsibilities.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                <span className="text-sm flex-1">{item}</span>
                <button onClick={() => removeFromList('responsibilities', i)} className="p-1 hover:bg-background rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Requirements</label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a requirement"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addToList('requirements', newRequirement, setNewRequirement))}
            />
            <Button onClick={() => addToList('requirements', newRequirement, setNewRequirement)} size="icon" variant="secondary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 mt-2">
            {formData.requirements.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-sm flex-1">{item}</span>
                <button onClick={() => removeFromList('requirements', i)} className="p-1 hover:bg-background rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" />
            Required Skills
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill (e.g., React, Python)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addToList('skills', newSkill, setNewSkill))}
            />
            <Button onClick={() => addToList('skills', newSkill, setNewSkill)} size="icon" variant="secondary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map((skill, i) => (
              <Badge key={i} variant="secondary" className="bg-primary/10 text-primary pr-1">
                {skill}
                <button onClick={() => removeFromList('skills', i)} className="ml-1 p-0.5 hover:bg-background/50 rounded">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Benefits & Perks</label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a benefit"
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addToList('benefits', newBenefit, setNewBenefit))}
            />
            <Button onClick={() => addToList('benefits', newBenefit, setNewBenefit)} size="icon" variant="secondary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.benefits.map((benefit, i) => (
              <Badge key={i} variant="secondary" className="bg-green-500/10 text-green-600 pr-1">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {benefit}
                <button onClick={() => removeFromList('benefits', i)} className="ml-1 p-0.5 hover:bg-background/50 rounded">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={createJobMutation.isPending}
          className="w-full h-12 bg-gradient-to-r from-primary to-red-500"
        >
          {createJobMutation.isPending ? "Posting..." : "Post Job"}
        </Button>
      </div>
    </div>
  );
}
