CREATE TYPE "govt_role" AS ENUM('district_nodal', 'system_admin');--> statement-breakpoint
CREATE TYPE "industry_contribution_type" AS ENUM('funding', 'mentorship', 'prototyping', 'deployment', 'testing');--> statement-breakpoint
CREATE TYPE "industry_type" AS ENUM('corporate', 'startup', 'msme', 'csr', 'research_lab', 'incubator', 'psu');--> statement-breakpoint
CREATE TABLE "company" (
	"companyID" varchar(255) PRIMARY KEY,
	"legalEntityName" text,
	"companyType" text,
	"industryType" text,
	"companyEmail" text,
	"companyWebsite" text,
	"registrationNumber" text,
	"taxIdentifier" text,
	"onboardingStatus" text
);
--> statement-breakpoint
CREATE TABLE "spoc" (
	"spocID" varchar(255) PRIMARY KEY,
	"companyID" varchar(255),
	"fullName" text,
	"designation" text,
	"email" text,
	"phoneNumber" text,
	"isPrimary" boolean
);
--> statement-breakpoint
CREATE TABLE "university" (
	"universityID" varchar(255) PRIMARY KEY,
	"universityName" text NOT NULL,
	"universityAddress" text,
	"universityContactNo" text,
	"universityWebsiteLink" text,
	"isUniversityActive" boolean DEFAULT true,
	"isUniversityVerified" boolean DEFAULT false,
	"universityResearchDepartments" text[],
	"AISHECode" text NOT NULL UNIQUE,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "university_spoc" (
	"spocID" varchar(255) PRIMARY KEY,
	"universityID" varchar(255),
	"firstname" text NOT NULL,
	"lastname" text NOT NULL,
	"universityEmail" text NOT NULL UNIQUE,
	"passwordHash" text NOT NULL,
	"refreshToken" text,
	"positionTitle" text,
	"departmentSpoc" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "govt_nodal" (
	"id" varchar(255) PRIMARY KEY,
	"firstname" text NOT NULL,
	"lastname" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"refresh_token" text,
	"role" "govt_role" DEFAULT 'district_nodal'::"govt_role" NOT NULL,
	"state" text NOT NULL,
	"district" text NOT NULL,
	"department" text NOT NULL,
	"designation" text NOT NULL,
	"office_id" text,
	"contact_no" text NOT NULL,
	"is_email_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY,
	"name" text,
	"email" text,
	"user_fk" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issue" (
	"id" varchar(255) PRIMARY KEY,
	"username" text,
	"email" text,
	"latitude" text,
	"longitude" text,
	"issue_title" text,
	"issue_description" text,
	"issue_proof" text[],
	"annonymous" boolean,
	"address" text,
	"createdAt" date DEFAULT now(),
	"updatedAt" date DEFAULT now(),
	"issue_fk" text
);
--> statement-breakpoint
CREATE TABLE "industry_partners" (
	"id" varchar(255) PRIMARY KEY,
	"name" text NOT NULL,
	"type" "industry_type" NOT NULL,
	"sector_tags" text[] NOT NULL,
	"contribution_types" "industry_contribution_type"[] NOT NULL,
	"operating_districts" text[],
	"location" text,
	"contact_details" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "industry_spoc" (
	"id" varchar(255) PRIMARY KEY,
	"industry_id" varchar(255) NOT NULL,
	"firstname" text NOT NULL,
	"lastname" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"refresh_token" text,
	"designation" text,
	"phone" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "citizens" (
	"id" varchar(255) PRIMARY KEY,
	"full_name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"phone" text,
	"state" text,
	"district" text,
	"pincode" text,
	"refresh_token" text,
	"is_email_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_district_nodal_idx" ON "govt_nodal" ("state","district");--> statement-breakpoint
ALTER TABLE "spoc" ADD CONSTRAINT "spoc_companyID_company_companyID_fkey" FOREIGN KEY ("companyID") REFERENCES "company"("companyID");--> statement-breakpoint
ALTER TABLE "university_spoc" ADD CONSTRAINT "university_spoc_universityID_university_universityID_fkey" FOREIGN KEY ("universityID") REFERENCES "university"("universityID");--> statement-breakpoint
ALTER TABLE "industry_spoc" ADD CONSTRAINT "industry_spoc_industry_id_industry_partners_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industry_partners"("id") ON DELETE CASCADE;