-- =====================================================
-- Ummah Confederation - Supabase Database Schema
-- =====================================================
-- Run this SQL in Supabase SQL Editor to create all tables
-- =====================================================

-- =====================================================
-- 1. INSTITUTIONS TABLE
-- =====================================================
CREATE TABLE institutions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,           -- "Ummah Cabinet"
  label TEXT,                          -- "Non-Profit • Private"
  full_name TEXT UNIQUE NOT NULL,      -- "Ummah Cabinet [Non-Profit • Private]"
  avatar_url TEXT,                     -- Supabase Storage URL
  cover_url TEXT,                      -- Supabase Storage URL
  bio TEXT DEFAULT 'Peace be upon you.',
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  contact_website TEXT,
  feed_widget_enabled BOOLEAN DEFAULT true,
  feed_widget_type TEXT DEFAULT 'prayer_time',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. JURISDICTIONS TABLE
-- =====================================================
CREATE TABLE jurisdictions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,           -- "Borneo"
  label TEXT,                          -- "Region"
  full_name TEXT UNIQUE NOT NULL,      -- "Borneo [Region]"
  avatar_url TEXT,
  cover_url TEXT,
  bio TEXT DEFAULT 'Peace be upon you.',
  feed_widget_enabled BOOLEAN DEFAULT true,
  feed_widget_type TEXT DEFAULT 'prayer_time',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. DOCUMENTS TABLE
-- =====================================================
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  doc_id TEXT UNIQUE NOT NULL,         -- "book0", "policy1", etc.
  title TEXT NOT NULL,
  item_type TEXT NOT NULL,             -- "Book", "Policy", "Decision", etc.
  institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
  jurisdiction_id INTEGER REFERENCES jurisdictions(id) ON DELETE SET NULL,
  version INTEGER DEFAULT 1,
  doc_date TIMESTAMPTZ,
  visible BOOLEAN DEFAULT true,
  content TEXT,                        -- Full HTML content (inside paper-sheet div)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. CAROUSELS TABLE
-- =====================================================
CREATE TABLE carousels (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
  jurisdiction_id INTEGER REFERENCES jurisdictions(id) ON DELETE SET NULL,
  visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CAROUSEL_SLIDES TABLE
-- =====================================================
CREATE TABLE carousel_slides (
  id SERIAL PRIMARY KEY,
  carousel_id INTEGER REFERENCES carousels(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  linked_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. SQUIRCLE_ICONS TABLE
-- =====================================================
CREATE TABLE squircle_icons (
  id SERIAL PRIMARY KEY,
  item_name TEXT UNIQUE NOT NULL,      -- "Book", "Policy", etc.
  emoji TEXT,                          -- "📚", "📋", etc.
  icon_url TEXT,
  icon_svg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_documents_item_type ON documents(item_type);
CREATE INDEX idx_documents_institution ON documents(institution_id);
CREATE INDEX idx_documents_jurisdiction ON documents(jurisdiction_id);
CREATE INDEX idx_documents_visible ON documents(visible);
CREATE INDEX idx_carousels_institution ON carousels(institution_id);
CREATE INDEX idx_carousels_jurisdiction ON carousels(jurisdiction_id);
CREATE INDEX idx_carousels_visible ON carousels(visible);
CREATE INDEX idx_carousel_slides_carousel ON carousel_slides(carousel_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE squircle_icons ENABLE ROW LEVEL SECURITY;

-- Public read access policies (anon key)
CREATE POLICY "Public read access" ON institutions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON jurisdictions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON documents FOR SELECT USING (true);
CREATE POLICY "Public read access" ON carousels FOR SELECT USING (true);
CREATE POLICY "Public read access" ON carousel_slides FOR SELECT USING (true);
CREATE POLICY "Public read access" ON squircle_icons FOR SELECT USING (true);

-- Service role write access (for admin operations in Supabase dashboard)
CREATE POLICY "Service role write access" ON institutions FOR ALL 
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON jurisdictions FOR ALL 
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON documents FOR ALL 
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON carousels FOR ALL 
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON carousel_slides FOR ALL 
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON squircle_icons FOR ALL 
  USING (auth.role() = 'service_role');

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jurisdictions_updated_at
  BEFORE UPDATE ON jurisdictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carousels_updated_at
  BEFORE UPDATE ON carousels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carousel_slides_updated_at
  BEFORE UPDATE ON carousel_slides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_squircle_icons_updated_at
  BEFORE UPDATE ON squircle_icons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================
-- Run this in Supabase Dashboard > Storage > Create Bucket
-- Bucket name: ummah-images
-- Public bucket: Yes

-- Storage policies (run after creating bucket)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ummah-images', 'ummah-images', true);

-- Public read access for images
-- CREATE POLICY "Public read access" ON storage.objects 
--   FOR SELECT USING (bucket_id = 'ummah-images');

-- Service role write access for images
-- CREATE POLICY "Service role write access" ON storage.objects 
--   FOR ALL USING (bucket_id = 'ummah-images' AND auth.role() = 'service_role');
