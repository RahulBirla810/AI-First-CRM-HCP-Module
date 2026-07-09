-- database_setup.sql
-- Setup script for AI-First CRM HCP Module Database (MySQL)

CREATE DATABASE IF NOT EXISTS `hcp_crm`;
USE `hcp_crm`;

-- 1. Healthcare Professionals (HCPs)
CREATE TABLE IF NOT EXISTS `hcps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `specialty` VARCHAR(100) NOT NULL,
  `clinic` VARCHAR(150) NULL,
  `email` VARCHAR(100) NULL,
  `phone` VARCHAR(50) NULL,
  `last_interaction_date` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Promotional/Marketing Materials
CREATE TABLE IF NOT EXISTS `materials` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `type` VARCHAR(50) NULL,
  `description` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Drug Samples
CREATE TABLE IF NOT EXISTS `samples` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `dosage` VARCHAR(50) NULL,
  `stock_quantity` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Interactions
CREATE TABLE IF NOT EXISTS `interactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hcp_id` INT NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `time` VARCHAR(50) NOT NULL,
  `interaction_type` VARCHAR(50) NOT NULL,
  `attendees` TEXT NULL, -- JSON formatted array
  `topics_discussed` TEXT NULL,
  `materials_shared` TEXT NULL, -- JSON formatted array of objects
  `samples_distributed` TEXT NULL, -- JSON formatted array of objects
  `sentiment` VARCHAR(20) NULL,
  `outcomes` TEXT NULL,
  `follow_up_actions` TEXT NULL,
  `ai_suggested_followups` TEXT NULL, -- JSON formatted array
  CONSTRAINT `fk_interactions_hcp` FOREIGN KEY (`hcp_id`) REFERENCES `hcps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Follow Up Tasks
CREATE TABLE IF NOT EXISTS `follow_up_tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `due_date` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Pending',
  `interaction_id` INT NOT NULL,
  CONSTRAINT `fk_tasks_interaction` FOREIGN KEY (`interaction_id`) REFERENCES `interactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Data Insertion
INSERT INTO `hcps` (`name`, `specialty`, `clinic`, `email`, `phone`, `last_interaction_date`) VALUES
('Dr. Sarah Jenkins', 'Cardiology', 'Heart Care Clinic, NY', 'sarah.jenkins@heartcare.org', '555-0199', '2026-06-15'),
('Dr. Robert Chen', 'Oncology', 'Metropolitan Oncology Center', 'r.chen@metonc.com', '555-0144', '2026-06-20'),
('Dr. Emily Taylor', 'Endocrinology', 'Diabetes & Thyroid Center', 'emily.taylor@diabetestc.org', '555-0177', '2026-05-10'),
('Dr. James Patel', 'Cardiology', 'Cardiovascular Associates', 'j.patel@cardioassoc.com', '555-0122', '2026-07-01');

INSERT INTO `materials` (`name`, `type`, `description`) VALUES
('OncoBoost Phase III Clinical Trial Results PDF', 'Clinical Paper', 'Comprehensive study on efficacy and side effects of OncoBoost in oncology patients.'),
('CardioCare Efficacy Brochure', 'PDF Brochure', 'Visual patient benefits, dosage charts, and cardiovascular safety profile of CardioCare.'),
('ThyroGlow Prescribing Information', 'Slide Deck', 'Full prescribing guide, indications, contraindications, and dose titration guidelines for ThyroGlow.');

INSERT INTO `samples` (`name`, `dosage`, `stock_quantity`) VALUES
('OncoBoost', '10mg', 100),
('CardioCare', '20mg', 250),
('ThyroGlow', '50mcg', 150);
