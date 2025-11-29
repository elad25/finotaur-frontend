import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  Image, Download, Share2, Copy, Check, 
  Palette, Type, Sparkles, Instagram, 
  Twitter, Facebook, MessageCircle, RefreshCw,
  ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';

// Logo paths - Update these to match your actual asset paths
const LOGO_WITH_BULL = '/logo.png'; // The bull head logo
const LOGO_TEXT_ONLY = '/logo-text.png'; // Text-only logo (or use the same if you only have one)

// Template Types
interface Template {
  id: string;
  name: string;
  nameHe: string;
  aspectRatio: '1:1' | '9:16' | '16:9';
  platform: 'instagram' | 'story' | 'twitter' | 'facebook';
  bgGradient: string;
  textColor: string;
  accentColor: string;
  logoType: 'bull' | 'text' | 'both';
  layout: 'centered' | 'top-logo' | 'minimal' | 'premium';
}

// Enhanced Templates with Logo Integration
const TEMPLATES: Template[] = [
  {
    id: 'premium-dark',
    name: 'Premium Dark',
    nameHe: 'פרימיום כהה',
    aspectRatio: '1:1',
    platform: 'instagram',
    bgGradient: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 40%, #1a1612 100%)',
    textColor: '#ffffff',
    accentColor: '#C9A646',
    logoType: 'bull',
    layout: 'premium',
  },
  {
    id: 'elegant-gold',
    name: 'Elegant Gold',
    nameHe: 'זהב אלגנטי',
    aspectRatio: '1:1',
    platform: 'instagram',
    bgGradient: 'linear-gradient(145deg, #0a0a0a 0%, #1a1612 50%, #0a0a0a 100%)',
    textColor: '#ffffff',
    accentColor: '#C9A646',
    logoType: 'text',
    layout: 'centered',
  },
  {
    id: 'gold-luxe',
    name: 'Gold Luxe',
    nameHe: 'זהב יוקרתי',
    aspectRatio: '1:1',
    platform: 'instagram',
    bgGradient: 'linear-gradient(135deg, #C9A646 0%, #A08036 50%, #6B5B44 100%)',
    textColor: '#000000',
    accentColor: '#ffffff',
    logoType: 'bull',
    layout: 'top-logo',
  },
  {
    id: 'story-premium',
    name: 'Story Premium',
    nameHe: 'סטורי פרימיום',
    aspectRatio: '9:16',
    platform: 'story',
    bgGradient: 'linear-gradient(180deg, #0d0d0d 0%, #1a1612 30%, #0d0d0d 70%, #1a1a1a 100%)',
    textColor: '#ffffff',
    accentColor: '#C9A646',
    logoType: 'bull',
    layout: 'premium',
  },
  {
    id: 'story-gold',
    name: 'Story Gold',
    nameHe: 'סטורי זהב',
    aspectRatio: '9:16',
    platform: 'story',
    bgGradient: 'linear-gradient(180deg, #C9A646 0%, #8B7355 40%, #4a3f2e 100%)',
    textColor: '#000000',
    accentColor: '#ffffff',
    logoType: 'both',
    layout: 'top-logo',
  },
  {
    id: 'twitter-elegant',
    name: 'Twitter Elegant',
    nameHe: 'טוויטר אלגנטי',
    aspectRatio: '16:9',
    platform: 'twitter',
    bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1612 50%, #0d0d0d 100%)',
    textColor: '#ffffff',
    accentColor: '#C9A646',
    logoType: 'bull',
    layout: 'minimal',
  },
  {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    nameHe: 'מינימלי כהה',
    aspectRatio: '1:1',
    platform: 'instagram',
    bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
    textColor: '#ffffff',
    accentColor: '#C9A646',
    logoType: 'text',
    layout: 'minimal',
  },
  {
    id: 'signature-black',
    name: 'Signature Black',
    nameHe: 'חתימה שחור',
    aspectRatio: '1:1',
    platform: 'instagram',
    bgGradient: 'radial-gradient(ellipse at center, #1a1612 0%, #0a0a0a 70%)',
    textColor: '#ffffff',
    accentColor: '#C9A646',
    logoType: 'bull',
    layout: 'centered',
  },
];

// Dimension configs - Using actual social media dimensions
const DIMENSION_CONFIG = {
  '1:1': { width: 1080, height: 1080, displayWidth: 380, displayHeight: 380 },
  '9:16': { width: 1080, height: 1920, displayWidth: 214, displayHeight: 380 },
  '16:9': { width: 1200, height: 675, displayWidth: 380, displayHeight: 214 },
};

// Headlines in English and Hebrew
const HEADLINES = [
  { en: 'Level Up Your Trading', he: 'שדרג את המסחר שלך' },
  { en: 'Trade Smarter, Not Harder', he: 'סחר חכם, לא קשה' },
  { en: 'Master Your Trades', he: 'שלוט בעסקאות שלך' },
  { en: 'Track. Analyze. Profit.', he: 'עקוב. נתח. הרווח.' },
  { en: 'Your Trading Edge', he: 'היתרון שלך במסחר' },
  { en: 'Professional Trading Journal', he: 'יומן מסחר מקצועי' },
];

// Discount messages
const DISCOUNT_MESSAGES = {
  10: { en: '10% OFF', he: '10% הנחה' },
  15: { en: '15% OFF', he: '15% הנחה' },
  20: { en: '20% OFF', he: '20% הנחה' },
};

export default function AffiliateMarketing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  
  // Customization state
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [selectedHeadline, setSelectedHeadline] = useState(HEADLINES[0]);
  const [customHeadline, setCustomHeadline] = useState('');
  const [showCode, setShowCode] = useState(true);
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  
  // Logo loading state
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Fetch affiliate data
  useEffect(() => {
    async function fetchAffiliate() {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('affiliates')
          .select('affiliate_code, discount_tier')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (error || !data) {
          navigate('/app/journal/overview');
          return;
        }

        setAffiliateCode(data.affiliate_code);
        setDiscountPercent(data.discount_tier === 'vip' ? 15 : 10);
      } catch (error) {
        console.error('Error fetching affiliate:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAffiliate();
  }, [user?.id, navigate]);

  // Preload logos
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setLogoLoaded(true);
    img.src = LOGO_WITH_BULL;
  }, []);

  // Copy code to clipboard
  const handleCopyCode = async () => {
    if (!affiliateCode) return;
    try {
      await navigator.clipboard.writeText(affiliateCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Copy caption to clipboard
  const handleCopyCaption = async () => {
    const caption = language === 'en' 
      ? `🚀 Want to level up your trading game? Check out Finotaur - the ultimate trading journal for serious traders!\n\n📊 Track your trades\n📈 Analyze your performance\n🎯 Improve your strategy\n\nUse my code ${affiliateCode} for ${discountPercent}% OFF! 🔥\n\n👉 finotaur.com`
      : `🚀 רוצים לשדרג את המסחר שלכם? הכירו את Finotaur - יומן המסחר האולטימטיבי לסוחרים רציניים!\n\n📊 עקבו אחרי העסקאות\n📈 נתחו את הביצועים\n🎯 שפרו את האסטרטגיה\n\nהשתמשו בקוד ${affiliateCode} וקבלו ${discountPercent}% הנחה! 🔥\n\n👉 finotaur.com`;
    
    try {
      await navigator.clipboard.writeText(caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download image
  const handleDownload = async () => {
    if (!canvasRef.current) return;
    
    setGenerating(true);
    try {
      const dimensions = DIMENSION_CONFIG[selectedTemplate.aspectRatio];
      const scale = dimensions.width / dimensions.displayWidth;
      
      const canvas = await html2canvas(canvasRef.current, {
        scale: scale,
        backgroundColor: null,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const link = document.createElement('a');
      link.download = `finotaur-promo-${affiliateCode}-${selectedTemplate.id}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Get display dimensions
  const dimensions = DIMENSION_CONFIG[selectedTemplate.aspectRatio];
  const displayHeadline = customHeadline || (language === 'en' ? selectedHeadline.en : selectedHeadline.he);
  const discountText = language === 'en' 
    ? DISCOUNT_MESSAGES[discountPercent as keyof typeof DISCOUNT_MESSAGES].en
    : DISCOUNT_MESSAGES[discountPercent as keyof typeof DISCOUNT_MESSAGES].he;
  const useCodeText = language === 'en' ? 'Use code:' : 'השתמשו בקוד:';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A646]"></div>
      </div>
    );
  }

  // Render logo based on template settings
  const renderLogo = () => {
    const logoSize = selectedTemplate.aspectRatio === '9:16' ? 'h-20 w-20' : 'h-16 w-16';
    const textSize = selectedTemplate.aspectRatio === '9:16' ? 'text-xl' : 'text-lg';
    
    if (selectedTemplate.logoType === 'bull' || selectedTemplate.logoType === 'both') {
      return (
        <div className="flex flex-col items-center gap-2">
          <img 
            src={LOGO_WITH_BULL} 
            alt="Finotaur" 
            className={cn(logoSize, "object-contain")}
            crossOrigin="anonymous"
          />
          {selectedTemplate.logoType === 'both' && (
            <span 
              className={cn("font-bold tracking-wider", textSize)}
              style={{ color: selectedTemplate.accentColor }}
            >
              FINOTAUR
            </span>
          )}
        </div>
      );
    }
    
    // Text-only logo
    return (
      <div className="flex flex-col items-center">
        <span 
          className={cn("font-bold tracking-[0.2em]", textSize === 'text-xl' ? 'text-2xl' : 'text-xl')}
          style={{ 
            color: selectedTemplate.accentColor,
            textShadow: selectedTemplate.textColor === '#ffffff' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          FINOTAUR
        </span>
        <div 
          className="w-24 h-0.5 mt-1"
          style={{ backgroundColor: selectedTemplate.accentColor, opacity: 0.6 }}
        />
      </div>
    );
  };

  // Render template content based on layout
  const renderTemplateContent = () => {
    const isStory = selectedTemplate.aspectRatio === '9:16';
    const isWide = selectedTemplate.aspectRatio === '16:9';
    
    switch (selectedTemplate.layout) {
      case 'premium':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            {/* Decorative top line */}
            <div 
              className="absolute top-8 left-1/2 -translate-x-1/2 w-16 h-0.5"
              style={{ backgroundColor: selectedTemplate.accentColor, opacity: 0.5 }}
            />
            
            {/* Logo */}
            <div className={isStory ? 'mb-8' : 'mb-6'}>
              {renderLogo()}
            </div>
            
            {/* Headline */}
            <h2 
              className={cn(
                "font-bold leading-tight",
                isStory ? 'text-3xl mb-8 max-w-[280px]' : 'text-2xl mb-6 max-w-[320px]'
              )}
              style={{ 
                color: selectedTemplate.textColor,
                textShadow: selectedTemplate.textColor === '#ffffff' ? '0 2px 8px rgba(0,0,0,0.4)' : 'none'
              }}
            >
              {displayHeadline}
            </h2>
            
            {/* Discount Badge */}
            <div 
              className={cn(
                "px-8 py-3 rounded-full font-bold shadow-lg",
                isStory ? 'text-xl mb-6' : 'text-lg mb-4'
              )}
              style={{ 
                backgroundColor: selectedTemplate.accentColor,
                color: selectedTemplate.accentColor === '#ffffff' ? '#000' : 
                       selectedTemplate.textColor === '#000000' ? '#000' : '#fff',
                boxShadow: `0 4px 20px ${selectedTemplate.accentColor}40`
              }}
            >
              {discountText}
            </div>
            
            {/* Code Display */}
            {showCode && (
              <div className={isStory ? 'mt-4' : 'mt-2'}>
                <p 
                  className="text-sm mb-2 opacity-70"
                  style={{ color: selectedTemplate.textColor }}
                >
                  {useCodeText}
                </p>
                <div 
                  className={cn(
                    "px-6 py-3 rounded-lg border-2 font-mono font-bold",
                    isStory ? 'text-2xl' : 'text-xl'
                  )}
                  style={{ 
                    borderColor: selectedTemplate.accentColor,
                    color: selectedTemplate.accentColor,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  {affiliateCode}
                </div>
              </div>
            )}
            
            {/* Website */}
            <p 
              className="absolute bottom-6 text-sm font-medium opacity-60"
              style={{ color: selectedTemplate.textColor }}
            >
              finotaur.com
            </p>
            
            {/* Decorative elements */}
            <div 
              className="absolute top-12 right-8 w-24 h-24 rounded-full opacity-5"
              style={{ backgroundColor: selectedTemplate.accentColor }}
            />
            <div 
              className="absolute bottom-16 left-6 w-20 h-20 rounded-full opacity-5"
              style={{ backgroundColor: selectedTemplate.accentColor }}
            />
          </div>
        );
        
      case 'top-logo':
        return (
          <div className="absolute inset-0 flex flex-col p-6 text-center">
            {/* Logo at top */}
            <div className={isStory ? 'mt-8 mb-auto' : 'mt-4 mb-auto'}>
              {renderLogo()}
            </div>
            
            {/* Center content */}
            <div className="flex flex-col items-center">
              {/* Headline */}
              <h2 
                className={cn(
                  "font-bold leading-tight",
                  isStory ? 'text-3xl mb-8' : 'text-2xl mb-6'
                )}
                style={{ color: selectedTemplate.textColor }}
              >
                {displayHeadline}
              </h2>
              
              {/* Discount Badge */}
              <div 
                className={cn(
                  "px-8 py-3 rounded-full font-bold",
                  isStory ? 'text-xl mb-6' : 'text-lg mb-4'
                )}
                style={{ 
                  backgroundColor: selectedTemplate.accentColor,
                  color: selectedTemplate.accentColor === '#ffffff' ? '#000' : 
                         selectedTemplate.textColor === '#000000' ? '#000' : '#fff'
                }}
              >
                {discountText}
              </div>
              
              {/* Code Display */}
              {showCode && (
                <div className="mt-2">
                  <p 
                    className="text-sm mb-2 opacity-80"
                    style={{ color: selectedTemplate.textColor }}
                  >
                    {useCodeText}
                  </p>
                  <div 
                    className={cn(
                      "px-6 py-3 rounded-lg border-2 font-mono font-bold",
                      isStory ? 'text-2xl' : 'text-xl'
                    )}
                    style={{ 
                      borderColor: selectedTemplate.accentColor,
                      color: selectedTemplate.textColor === '#000000' ? '#000' : selectedTemplate.accentColor,
                      backgroundColor: selectedTemplate.textColor === '#000000' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                    }}
                  >
                    {affiliateCode}
                  </div>
                </div>
              )}
            </div>
            
            {/* Website at bottom */}
            <p 
              className={cn(
                "mt-auto text-sm font-medium opacity-70",
                isStory ? 'mb-8' : 'mb-4'
              )}
              style={{ color: selectedTemplate.textColor }}
            >
              finotaur.com
            </p>
          </div>
        );
        
      case 'minimal':
        return (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center p-6",
            isWide ? 'flex-row gap-8' : 'flex-col text-center'
          )}>
            {/* Logo */}
            <div className={isWide ? '' : 'mb-4'}>
              {renderLogo()}
            </div>
            
            {/* Content */}
            <div className={cn("flex flex-col", isWide ? 'items-start' : 'items-center')}>
              {/* Headline */}
              <h2 
                className={cn(
                  "font-bold leading-tight mb-4",
                  isWide ? 'text-2xl' : 'text-xl'
                )}
                style={{ color: selectedTemplate.textColor }}
              >
                {displayHeadline}
              </h2>
              
              {/* Discount + Code inline */}
              <div className={cn("flex items-center gap-3", isWide ? '' : 'flex-wrap justify-center')}>
                <span 
                  className="px-4 py-2 rounded-full font-bold text-sm"
                  style={{ 
                    backgroundColor: selectedTemplate.accentColor,
                    color: selectedTemplate.accentColor === '#ffffff' ? '#000' : '#fff'
                  }}
                >
                  {discountText}
                </span>
                {showCode && (
                  <span 
                    className="px-4 py-2 rounded-lg border font-mono font-bold text-sm"
                    style={{ 
                      borderColor: selectedTemplate.accentColor,
                      color: selectedTemplate.accentColor
                    }}
                  >
                    {affiliateCode}
                  </span>
                )}
              </div>
            </div>
            
            {/* Website */}
            <p 
              className={cn(
                "absolute text-xs font-medium opacity-50",
                isWide ? 'bottom-4 right-6' : 'bottom-4'
              )}
              style={{ color: selectedTemplate.textColor }}
            >
              finotaur.com
            </p>
          </div>
        );
        
      case 'centered':
      default:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            {/* Logo */}
            <div className="mb-6">
              {renderLogo()}
            </div>
            
            {/* Headline */}
            <h2 
              className={cn(
                "font-bold mb-6",
                isStory ? 'text-3xl' : 'text-2xl'
              )}
              style={{ color: selectedTemplate.textColor }}
            >
              {displayHeadline}
            </h2>
            
            {/* Discount Badge */}
            <div 
              className="px-8 py-3 rounded-full font-bold text-lg mb-4"
              style={{ 
                backgroundColor: selectedTemplate.accentColor,
                color: selectedTemplate.accentColor === '#ffffff' ? '#000' : 
                       selectedTemplate.textColor === '#000000' ? '#000' : '#fff'
              }}
            >
              {discountText}
            </div>
            
            {/* Code Display */}
            {showCode && (
              <div className="mt-2">
                <p 
                  className="text-sm mb-2 opacity-80"
                  style={{ color: selectedTemplate.textColor }}
                >
                  {useCodeText}
                </p>
                <div 
                  className="px-6 py-3 rounded-lg border-2 font-mono font-bold text-xl"
                  style={{ 
                    borderColor: selectedTemplate.accentColor,
                    color: selectedTemplate.accentColor,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                  }}
                >
                  {affiliateCode}
                </div>
              </div>
            )}
            
            {/* Decorative corner accents */}
            <div 
              className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg"
              style={{ borderColor: selectedTemplate.accentColor, opacity: 0.3 }}
            />
            <div 
              className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg"
              style={{ borderColor: selectedTemplate.accentColor, opacity: 0.3 }}
            />
            <div 
              className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg"
              style={{ borderColor: selectedTemplate.accentColor, opacity: 0.3 }}
            />
            <div 
              className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 rounded-br-lg"
              style={{ borderColor: selectedTemplate.accentColor, opacity: 0.3 }}
            />
          </div>
        );
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-[#C9A646]" />
          {language === 'en' ? 'Marketing Materials' : 'חומרי שיווק'}
        </h1>
        <p className="text-gray-400 mt-1">
          {language === 'en' 
            ? 'Create professional promotional images for social media' 
            : 'צור תמונות שיווקיות מקצועיות לרשתות החברתיות'}
        </p>
      </div>

      {/* Language Toggle + Your Code */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div 
          className="rounded-xl px-4 py-3 flex-1"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.05) 100%)',
            border: '1px solid rgba(201,166,70,0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{language === 'en' ? 'Your Code:' : 'הקוד שלך:'}</span>
              <span className="text-2xl font-mono font-bold text-[#C9A646]">{affiliateCode}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                copied 
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-[#C9A646]/20 text-[#C9A646] hover:bg-[#C9A646]/30"
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? (language === 'en' ? 'Copied!' : 'הועתק!') : (language === 'en' ? 'Copy' : 'העתק')}
            </button>
          </div>
        </div>
        
        {/* Language Toggle */}
        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1">
          <button
            onClick={() => setLanguage('en')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              language === 'en' 
                ? "bg-[#C9A646] text-black" 
                : "text-gray-400 hover:text-white"
            )}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('he')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              language === 'he' 
                ? "bg-[#C9A646] text-black" 
                : "text-gray-400 hover:text-white"
            )}
          >
            עברית
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preview Panel */}
        <div 
          className="rounded-xl p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            {language === 'en' ? 'Preview' : 'תצוגה מקדימה'}
          </h3>
          
          {/* Preview Container */}
          <div className="flex justify-center">
            <div 
              ref={canvasRef}
              style={{
                width: dimensions.displayWidth,
                height: dimensions.displayHeight,
                background: selectedTemplate.bgGradient,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px',
              }}
              className="shadow-2xl"
            >
              {renderTemplateContent()}
            </div>
          </div>

          {/* Download Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-[#C9A646] text-black rounded-lg font-medium hover:bg-[#D4B85A] transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {language === 'en' ? 'Generating...' : 'מייצר...'}
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  {language === 'en' ? 'Download Image' : 'הורד תמונה'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Customization Panel */}
        <div className="space-y-6">
          {/* Template Selection */}
          <div 
            className="rounded-xl p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-[#C9A646]" />
              {language === 'en' ? 'Choose Template' : 'בחר תבנית'}
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-left",
                    selectedTemplate.id === template.id
                      ? "border-[#C9A646] bg-[#C9A646]/10"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <div 
                    className="w-full h-14 rounded mb-2 flex items-center justify-center"
                    style={{ background: template.bgGradient }}
                  >
                    {/* Mini logo preview */}
                    <span 
                      className="text-[8px] font-bold"
                      style={{ color: template.accentColor }}
                    >
                      FINOTAUR
                    </span>
                  </div>
                  <p className="text-white text-xs font-medium truncate">
                    {language === 'en' ? template.name : template.nameHe}
                  </p>
                  <p className="text-gray-500 text-xs">{template.aspectRatio}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Headline Selection */}
          <div 
            className="rounded-xl p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Type className="h-5 w-5 text-[#C9A646]" />
              {language === 'en' ? 'Headline' : 'כותרת'}
            </h3>
            
            {/* Pre-made headlines */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {HEADLINES.map((h, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedHeadline(h);
                    setCustomHeadline('');
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm text-left transition-all",
                    selectedHeadline === h && !customHeadline
                      ? "bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/30"
                      : "bg-black/20 text-gray-300 border border-white/5 hover:border-white/10"
                  )}
                >
                  {language === 'en' ? h.en : h.he}
                </button>
              ))}
            </div>
            
            {/* Custom headline */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                {language === 'en' ? 'Or write your own:' : 'או כתוב משלך:'}
              </label>
              <input
                type="text"
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                placeholder={language === 'en' ? 'Enter custom headline...' : 'הכנס כותרת מותאמת...'}
                maxLength={40}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A646]/50"
                dir={language === 'he' ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          {/* Options */}
          <div 
            className="rounded-xl p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C9A646]" />
              {language === 'en' ? 'Options' : 'אפשרויות'}
            </h3>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showCode}
                onChange={(e) => setShowCode(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-black/30 text-[#C9A646] focus:ring-[#C9A646]/50"
              />
              <span className="text-gray-300">
                {language === 'en' ? 'Show coupon code on image' : 'הצג קוד קופון בתמונה'}
              </span>
            </label>
          </div>

          {/* Platform Tips */}
          <div 
            className="rounded-xl p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              {language === 'en' ? 'Recommended Sizes' : 'גדלים מומלצים'}
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-400">
                <Instagram className="h-5 w-5 text-pink-400" />
                <span>Instagram Post: 1:1 (1080x1080)</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <MessageCircle className="h-5 w-5 text-purple-400" />
                <span>Instagram/TikTok Story: 9:16 (1080x1920)</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Twitter className="h-5 w-5 text-blue-400" />
                <span>Twitter/X Post: 16:9 (1200x675)</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Facebook className="h-5 w-5 text-blue-500" />
                <span>Facebook Post: 1:1 or 16:9</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Share Text */}
      <div 
        className="rounded-xl p-6"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,26,0.8) 0%, rgba(20,20,20,0.9) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-[#C9A646]" />
          {language === 'en' ? 'Ready-to-Use Caption' : 'טקסט מוכן לשימוש'}
        </h3>
        
        <div 
          className="bg-black/30 rounded-lg p-4 text-gray-300"
          dir={language === 'he' ? 'rtl' : 'ltr'}
        >
          {language === 'en' ? (
            <>
              <p className="mb-4">
                🚀 Want to level up your trading game? Check out Finotaur - the ultimate trading journal for serious traders!
              </p>
              <p className="mb-4">
                📊 Track your trades<br/>
                📈 Analyze your performance<br/>
                🎯 Improve your strategy
              </p>
              <p className="text-[#C9A646] font-medium">
                Use my code <span className="font-mono font-bold">{affiliateCode}</span> for {discountPercent}% OFF! 🔥
              </p>
              <p className="mt-4 text-gray-500">
                👉 finotaur.com
              </p>
            </>
          ) : (
            <>
              <p className="mb-4">
                🚀 רוצים לשדרג את המסחר שלכם? הכירו את Finotaur - יומן המסחר האולטימטיבי לסוחרים רציניים!
              </p>
              <p className="mb-4">
                📊 עקבו אחרי העסקאות<br/>
                📈 נתחו את הביצועים<br/>
                🎯 שפרו את האסטרטגיה
              </p>
              <p className="text-[#C9A646] font-medium">
                השתמשו בקוד <span className="font-mono font-bold">{affiliateCode}</span> וקבלו {discountPercent}% הנחה! 🔥
              </p>
              <p className="mt-4 text-gray-500">
                👉 finotaur.com
              </p>
            </>
          )}
        </div>
        
        <button
          onClick={handleCopyCaption}
          className={cn(
            "mt-4 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
            captionCopied 
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          )}
        >
          {captionCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {captionCopied 
            ? (language === 'en' ? 'Copied!' : 'הועתק!') 
            : (language === 'en' ? 'Copy Caption' : 'העתק טקסט')}
        </button>
      </div>
    </div>
  );
}