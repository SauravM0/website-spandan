export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  doctor_id: string | null;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Doctor {
  id: string;
  name: string;
  slug: string;
  speciality: string;
  qualifications: string;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Package {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  base_price: number;
  discounted_price: number | null;
  show_price_publicly: boolean;
  prep_instructions: string | null;
  image_url: string | null;
  category: string;
  primary_doctor_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PackageTest {
  id: string;
  package_id: string;
  test_name: string;
  sort_order: number;
  created_at: Date;
}

export interface AppointmentRequest {
  id: string;
  package_id: string | null;
  doctor_id: string | null;
  patient_name: string;
  phone: string;
  email: string | null;
  referring_doctor_name: string | null;
  referring_doctor_phone: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  message: string;
  status: string;
  consent_given_at: Date;
  source_language: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeadStatusHistory {
  id: string;
  appointment_request_id: string;
  old_status: string | null;
  new_status: string;
  changed_by_staff_id: string | null;
  changed_at: Date;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  body_md: string;
  excerpt: string;
  language: string;
  translation_group_id: string | null;
  cover_image_url: string | null;
  youtube_video_url: string | null;
  author_doctor_id: string | null;
  category: string;
  tags: string[];
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicArticle extends Article {
  author_doctor_name: string | null;
  author_doctor_slug: string | null;
  author_doctor_speciality: string | null;
}

export interface LeadFilters {
  status?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
