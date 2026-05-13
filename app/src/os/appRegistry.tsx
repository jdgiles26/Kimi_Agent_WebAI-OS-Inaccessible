import type { AppDefinition, AppCategory } from '@/types/os';

// System Apps
import FileManager from '@/apps/system/FileManager';
import Terminal from '@/apps/system/Terminal';
import WebBrowser from '@/apps/system/WebBrowser';
import Calculator from '@/apps/system/Calculator';
import Calendar from '@/apps/system/Calendar';
import Settings from '@/apps/system/Settings';
import ModelGarden from '@/apps/system/ModelGarden';
import ToolStudio from '@/apps/system/ToolStudio';
import CustomToolRunner from '@/apps/system/CustomToolRunner';
import WorkflowBuilder from '@/apps/system/WorkflowBuilder';
import RemoteAccess from '@/apps/system/RemoteAccess';

// AI Research & Analysis
import ChatRAG from '@/apps/ai-research/ChatRAG';
import MultiTabSynthesizer from '@/apps/ai-research/MultiTabSynthesizer';
import TLDRGenerator from '@/apps/ai-research/TLDRGenerator';
import FactChecker from '@/apps/ai-research/FactChecker';
import BiasDetector from '@/apps/ai-research/BiasDetector';
import GlossaryBuilder from '@/apps/ai-research/GlossaryBuilder';
import CitationGenerator from '@/apps/ai-research/CitationGenerator';
import CompetitorMatrix from '@/apps/ai-research/CompetitorMatrix';

// Vision & Media
import SketchToPhoto from '@/apps/vision/SketchToPhoto';
import UIToCode from '@/apps/vision/UIToCode';
import ImageUpscaler from '@/apps/vision/ImageUpscaler';
import BackgroundRemover from '@/apps/vision/BackgroundRemover';
import AltTextGen from '@/apps/vision/AltTextGen';
import ColorPaletteExtractor from '@/apps/vision/ColorPaletteExtractor';
import YouTubeSummarizer from '@/apps/vision/YouTubeSummarizer';
import VisualShopper from '@/apps/vision/VisualShopper';
import MemeGenerator from '@/apps/vision/MemeGenerator';

// Writing & Content
import SmartReplier from '@/apps/writing/SmartReplier';
import ToneShifter from '@/apps/writing/ToneShifter';
import FormFillerAI from '@/apps/writing/FormFillerAI';
import SEOOptimizer from '@/apps/writing/SEOOptimizer';
import ThreadMaker from '@/apps/writing/ThreadMaker';
import PromptUpgrader from '@/apps/writing/PromptUpgrader';
import InlineTranslator from '@/apps/writing/InlineTranslator';
import StoryGenerator from '@/apps/writing/StoryGenerator';

// Development
import CodeExplainer from '@/apps/dev/CodeExplainer';
import BugHunter from '@/apps/dev/BugHunter';
import RegexBuilder from '@/apps/dev/RegexBuilder';
import APIGuru from '@/apps/dev/APIGuru';
import CSSToTailwind from '@/apps/dev/CSSToTailwind';
import ConsoleSolver from '@/apps/dev/ConsoleSolver';
import QueryGenerator from '@/apps/dev/QueryGenerator';
import CodeReviewer from '@/apps/dev/CodeReviewer';

// Productivity
import ScheduleExtractor from '@/apps/productivity/ScheduleExtractor';
import EquationSolver from '@/apps/productivity/EquationSolver';
import PriceTracker from '@/apps/productivity/PriceTracker';
import SmartTabOrganizer from '@/apps/productivity/SmartTabOrganizer';
import WebScraper from '@/apps/productivity/WebScraper';
import ReceiptParser from '@/apps/productivity/ReceiptParser';
import SubscriptionScanner from '@/apps/productivity/SubscriptionScanner';
import MeetingSummarizer from '@/apps/productivity/MeetingSummarizer';

// Voice & Audio
import PageToPodcast from '@/apps/voice/PageToPodcast';
import VoiceNavigator from '@/apps/voice/VoiceNavigator';
import LiveTranscriber from '@/apps/voice/LiveTranscriber';
import MeetingNoteTaker from '@/apps/voice/MeetingNoteTaker';
import TextToSpeech from '@/apps/voice/TextToSpeech';

// Privacy & Security
import PhishingShield from '@/apps/privacy/PhishingShield';
import CookieAutoDeny from '@/apps/privacy/CookieAutoDeny';
import TOSAnalyzer from '@/apps/privacy/TOSAnalyzer';
import TrackerBlocker from '@/apps/privacy/TrackerBlocker';
import PasswordAnalyzer from '@/apps/privacy/PasswordAnalyzer';

// Creative
import MusicGenerator from '@/apps/creative/MusicGenerator';
import LogoGenerator from '@/apps/creative/LogoGenerator';
import PoemGenerator from '@/apps/creative/PoemGenerator';
import ResumeBuilder from '@/apps/creative/ResumeBuilder';
import MindMapGenerator from '@/apps/creative/MindMapGenerator';

export const appCategories: AppCategory[] = [
  'System',
  'AI Research',
  'Vision & Media',
  'Writing',
  'Development',
  'Productivity',
  'Voice & Audio',
  'Privacy & Security',
  'Creative',
];

export const appRegistry: AppDefinition[] = [
  // System (6)
  {
    id: 'files', name: 'File Manager', description: 'Browse and manage files', category: 'System',
    icon: 'FolderOpen', defaultWidth: 800, defaultHeight: 500, minWidth: 400, minHeight: 300,
    component: FileManager,
  },
  {
    id: 'terminal', name: 'Terminal', description: 'Command-line interface', category: 'System',
    icon: 'Terminal', defaultWidth: 700, defaultHeight: 450, minWidth: 400, minHeight: 250,
    component: Terminal,
  },
  {
    id: 'browser', name: 'Web Browser', description: 'Browse the web with AI features', category: 'System',
    icon: 'Globe', defaultWidth: 900, defaultHeight: 600, minWidth: 500, minHeight: 350,
    component: WebBrowser,
  },
  {
    id: 'calc', name: 'Calculator', description: 'Scientific calculator', category: 'System',
    icon: 'Calculator', defaultWidth: 360, defaultHeight: 520, minWidth: 300, minHeight: 400,
    component: Calculator,
  },
  {
    id: 'calendar', name: 'Calendar', description: 'Calendar with events', category: 'System',
    icon: 'Calendar', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: Calendar,
  },
  {
    id: 'settings', name: 'Settings', description: 'System preferences', category: 'System',
    icon: 'Settings', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: Settings,
  },
  {
    id: 'modelgarden', name: 'Model Garden', description: 'Browse, pin, and add WebGPU AI models', category: 'System',
    icon: 'Sprout', defaultWidth: 880, defaultHeight: 600, minWidth: 480, minHeight: 380,
    component: ModelGarden, requiresWebGPU: true,
  },
  {
    id: 'toolstudio', name: 'Tool Studio', description: 'Build & save your own AI tools', category: 'System',
    icon: 'Wand2', defaultWidth: 900, defaultHeight: 620, minWidth: 520, minHeight: 400,
    component: ToolStudio, requiresWebGPU: true,
  },
  {
    id: 'customtool', name: 'Custom Tool', description: 'Runs a saved tool', category: 'System',
    icon: 'Sparkles', defaultWidth: 700, defaultHeight: 520, minWidth: 380, minHeight: 320,
    component: CustomToolRunner, requiresWebGPU: true,
  },
  {
    id: 'workflow', name: 'Workflow Builder', description: 'Chain AI tools into reusable recipes', category: 'System',
    icon: 'Workflow', defaultWidth: 1000, defaultHeight: 640, minWidth: 560, minHeight: 420,
    component: WorkflowBuilder, requiresWebGPU: true,
  },
  {
    id: 'remote', name: 'Remote Access', description: 'Open this OS on your phone (QR + LAN URLs)', category: 'System',
    icon: 'Smartphone', defaultWidth: 720, defaultHeight: 520, minWidth: 420, minHeight: 360,
    component: RemoteAccess,
  },

  // AI Research & Analysis (8)
  {
    id: 'chatrag', name: 'Chat with Page', description: 'Ask questions about webpage content', category: 'AI Research',
    icon: 'MessageSquare', defaultWidth: 750, defaultHeight: 550, minWidth: 400, minHeight: 350,
    component: ChatRAG, requiresWebGPU: true,
  },
  {
    id: 'synthesizer', name: 'Tab Synthesizer', description: 'Cross-reference data across tabs', category: 'AI Research',
    icon: 'GitMerge', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: MultiTabSynthesizer, requiresWebGPU: true,
  },
  {
    id: 'tldr', name: 'TL;DR Generator', description: '3-bullet summaries of content', category: 'AI Research',
    icon: 'List', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: TLDRGenerator, requiresWebGPU: true,
  },
  {
    id: 'factchecker', name: 'Fact Checker', description: 'Verify claims against sources', category: 'AI Research',
    icon: 'CheckCircle', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: FactChecker, requiresWebGPU: true,
  },
  {
    id: 'biasdetector', name: 'Bias Detector', description: 'Analyze articles for slant', category: 'AI Research',
    icon: 'Scale', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: BiasDetector, requiresWebGPU: true,
  },
  {
    id: 'glossary', name: 'Glossary Builder', description: 'Auto-define complex jargon', category: 'AI Research',
    icon: 'BookOpen', defaultWidth: 600, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: GlossaryBuilder, requiresWebGPU: true,
  },
  {
    id: 'citation', name: 'Citation Generator', description: 'Format pages into APA/MLA', category: 'AI Research',
    icon: 'Quote', defaultWidth: 600, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: CitationGenerator, requiresWebGPU: true,
  },
  {
    id: 'compmatrix', name: 'Competitor Matrix', description: 'Build comparison tables', category: 'AI Research',
    icon: 'Table', defaultWidth: 750, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: CompetitorMatrix, requiresWebGPU: true,
  },

  // Vision & Media (9)
  {
    id: 'sketch2photo', name: 'Sketch to Photo', description: 'Doodle to photorealistic image', category: 'Vision & Media',
    icon: 'Palette', defaultWidth: 850, defaultHeight: 600, minWidth: 500, minHeight: 400,
    component: SketchToPhoto, requiresWebGPU: true,
  },
  {
    id: 'uitocode', name: 'UI to Code', description: 'Screenshot to React/Tailwind', category: 'Vision & Media',
    icon: 'Code2', defaultWidth: 800, defaultHeight: 550, minWidth: 450, minHeight: 350,
    component: UIToCode, requiresWebGPU: true,
  },
  {
    id: 'upscaler', name: 'Image Upscaler', description: 'Enhance low-res images', category: 'Vision & Media',
    icon: 'ZoomIn', defaultWidth: 800, defaultHeight: 550, minWidth: 450, minHeight: 350,
    component: ImageUpscaler, requiresWebGPU: true,
  },
  {
    id: 'bgremover', name: 'Background Remover', description: 'Extract subjects from images', category: 'Vision & Media',
    icon: 'Scissors', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: BackgroundRemover, requiresWebGPU: true,
  },
  {
    id: 'alttext', name: 'Alt Text Gen', description: 'Generate image descriptions', category: 'Vision & Media',
    icon: 'Image', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: AltTextGen, requiresWebGPU: true,
  },
  {
    id: 'colorextract', name: 'Color Palette', description: 'Extract and generate colors', category: 'Vision & Media',
    icon: 'Droplets', defaultWidth: 600, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: ColorPaletteExtractor, requiresWebGPU: true,
  },
  {
    id: 'ytsummarizer', name: 'YT Summarizer', description: 'Chapter markers from videos', category: 'Vision & Media',
    icon: 'Youtube', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: YouTubeSummarizer, requiresWebGPU: true,
  },
  {
    id: 'visualshopper', name: 'Visual Shopper', description: 'Find items from images', category: 'Vision & Media',
    icon: 'ShoppingBag', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: VisualShopper, requiresWebGPU: true,
  },
  {
    id: 'memegen', name: 'Meme Generator', description: 'AI-powered meme creation', category: 'Vision & Media',
    icon: 'Laugh', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: MemeGenerator, requiresWebGPU: true,
  },

  // Writing & Content (8)
  {
    id: 'smartreply', name: 'Smart Replier', description: 'Draft contextual responses', category: 'Writing',
    icon: 'Reply', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: SmartReplier, requiresWebGPU: true,
  },
  {
    id: 'toneshifter', name: 'Tone Shifter', description: 'Rewrite text in any tone', category: 'Writing',
    icon: 'Type', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: ToneShifter, requiresWebGPU: true,
  },
  {
    id: 'formfiller', name: 'Form Filler AI', description: 'Auto-complete forms', category: 'Writing',
    icon: 'FileInput', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: FormFillerAI, requiresWebGPU: true,
  },
  {
    id: 'seooptimizer', name: 'SEO Optimizer', description: 'Keyword improvements', category: 'Writing',
    icon: 'TrendingUp', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: SEOOptimizer, requiresWebGPU: true,
  },
  {
    id: 'threadmaker', name: 'Thread Maker', description: 'Articles to social threads', category: 'Writing',
    icon: 'Share2', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: ThreadMaker, requiresWebGPU: true,
  },
  {
    id: 'promptupgrader', name: 'Prompt Upgrader', description: 'Enhance prompts for LLMs', category: 'Writing',
    icon: 'Sparkles', defaultWidth: 600, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: PromptUpgrader, requiresWebGPU: true,
  },
  {
    id: 'translator', name: 'Translator', description: 'Translate while preserving layout', category: 'Writing',
    icon: 'Languages', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: InlineTranslator, requiresWebGPU: true,
  },
  {
    id: 'storygen', name: 'Story Generator', description: 'Creative stories from prompts', category: 'Writing',
    icon: 'Feather', defaultWidth: 650, defaultHeight: 500, minWidth: 350, minHeight: 350,
    component: StoryGenerator, requiresWebGPU: true,
  },

  // Development (8)
  {
    id: 'codeexplainer', name: 'Code Explainer', description: 'Code to plain English', category: 'Development',
    icon: 'FileCode', defaultWidth: 750, defaultHeight: 550, minWidth: 400, minHeight: 350,
    component: CodeExplainer, requiresWebGPU: true,
  },
  {
    id: 'bughunter', name: 'Bug Hunter', description: 'Scan code for vulnerabilities', category: 'Development',
    icon: 'Bug', defaultWidth: 750, defaultHeight: 550, minWidth: 400, minHeight: 350,
    component: BugHunter, requiresWebGPU: true,
  },
  {
    id: 'regexbuilder', name: 'Regex Builder', description: 'Text to regex patterns', category: 'Development',
    icon: 'Search', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: RegexBuilder, requiresWebGPU: true,
  },
  {
    id: 'apiguru', name: 'API Guru', description: 'Generate curl/fetch requests', category: 'Development',
    icon: 'Plug', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: APIGuru, requiresWebGPU: true,
  },
  {
    id: 'css2tailwind', name: 'CSS to Tailwind', description: 'Convert CSS to utility classes', category: 'Development',
    icon: 'Wind', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: CSSToTailwind, requiresWebGPU: true,
  },
  {
    id: 'consolesolver', name: 'Console Solver', description: 'Fix console errors', category: 'Development',
    icon: 'BugOff', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: ConsoleSolver, requiresWebGPU: true,
  },
  {
    id: 'querygen', name: 'Query Generator', description: 'Text to SQL/NoSQL', category: 'Development',
    icon: 'Database', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: QueryGenerator, requiresWebGPU: true,
  },
  {
    id: 'codereviewer', name: 'Code Reviewer', description: 'AI code review', category: 'Development',
    icon: 'Eye', defaultWidth: 750, defaultHeight: 550, minWidth: 400, minHeight: 350,
    component: CodeReviewer, requiresWebGPU: true,
  },

  // Productivity (8)
  {
    id: 'schedulex', name: 'Schedule Extractor', description: 'Parse dates from text', category: 'Productivity',
    icon: 'CalendarDays', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: ScheduleExtractor, requiresWebGPU: true,
  },
  {
    id: 'equationsolver', name: 'Equation Solver', description: 'OCR and solve math', category: 'Productivity',
    icon: 'Sigma', defaultWidth: 600, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: EquationSolver, requiresWebGPU: true,
  },
  {
    id: 'pricetracker', name: 'Price Tracker', description: 'Monitor price drops', category: 'Productivity',
    icon: 'Tag', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: PriceTracker,
  },
  {
    id: 'taborganizer', name: 'Tab Organizer', description: 'Group tabs by context', category: 'Productivity',
    icon: 'LayoutGrid', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: SmartTabOrganizer, requiresWebGPU: true,
  },
  {
    id: 'webscraper', name: 'Web Scraper', description: 'Extract data to CSV', category: 'Productivity',
    icon: 'Download', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: WebScraper,
  },
  {
    id: 'receiptparser', name: 'Receipt Parser', description: 'Extract from PDFs', category: 'Productivity',
    icon: 'Receipt', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: ReceiptParser, requiresWebGPU: true,
  },
  {
    id: 'subscanner', name: 'Subscription Scanner', description: 'Find recurring payments', category: 'Productivity',
    icon: 'CreditCard', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: SubscriptionScanner, requiresWebGPU: true,
  },
  {
    id: 'meetingsum', name: 'Meeting Summarizer', description: 'Summarize conferences', category: 'Productivity',
    icon: 'Users', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: MeetingSummarizer, requiresWebGPU: true,
  },

  // Voice & Audio (5)
  {
    id: 'page2podcast', name: 'Page to Podcast', description: 'Articles to audio', category: 'Voice & Audio',
    icon: 'Headphones', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: PageToPodcast, requiresWebGPU: true,
  },
  {
    id: 'voicenav', name: 'Voice Navigator', description: 'Voice control browser', category: 'Voice & Audio',
    icon: 'Mic', defaultWidth: 500, defaultHeight: 350, minWidth: 350, minHeight: 250,
    component: VoiceNavigator,
  },
  {
    id: 'transcriber', name: 'Live Transcriber', description: 'Subtitles for audio', category: 'Voice & Audio',
    icon: 'Subtitles', defaultWidth: 600, defaultHeight: 400, minWidth: 350, minHeight: 250,
    component: LiveTranscriber,
  },
  {
    id: 'meetingnotes', name: 'Meeting Notes', description: 'Auto-capture meetings', category: 'Voice & Audio',
    icon: 'ClipboardList', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: MeetingNoteTaker, requiresWebGPU: true,
  },
  {
    id: 'tts', name: 'Text to Speech', description: 'Text to natural speech', category: 'Voice & Audio',
    icon: 'Volume2', defaultWidth: 600, defaultHeight: 400, minWidth: 350, minHeight: 250,
    component: TextToSpeech,
  },

  // Privacy & Security (5)
  {
    id: 'phishshield', name: 'Phishing Shield', description: 'Detect spoofed pages', category: 'Privacy & Security',
    icon: 'Shield', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: PhishingShield, requiresWebGPU: true,
  },
  {
    id: 'cookiedeny', name: 'Cookie Denier', description: 'Reject non-essential cookies', category: 'Privacy & Security',
    icon: 'Cookie', defaultWidth: 500, defaultHeight: 350, minWidth: 350, minHeight: 250,
    component: CookieAutoDeny,
  },
  {
    id: 'tosanalyzer', name: 'TOS Analyzer', description: 'Scan terms of service', category: 'Privacy & Security',
    icon: 'FileText', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: TOSAnalyzer, requiresWebGPU: true,
  },
  {
    id: 'trackerblock', name: 'Tracker Blocker', description: 'Block tracking scripts', category: 'Privacy & Security',
    icon: 'EyeOff', defaultWidth: 600, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: TrackerBlocker,
  },
  {
    id: 'passanalyzer', name: 'Password Analyzer', description: 'AI password strength', category: 'Privacy & Security',
    icon: 'Lock', defaultWidth: 550, defaultHeight: 400, minWidth: 350, minHeight: 250,
    component: PasswordAnalyzer, requiresWebGPU: true,
  },

  // Creative (5)
  {
    id: 'musicgen', name: 'Music Generator', description: 'Ambient music from text', category: 'Creative',
    icon: 'Music', defaultWidth: 650, defaultHeight: 450, minWidth: 350, minHeight: 300,
    component: MusicGenerator, requiresWebGPU: true,
  },
  {
    id: 'logogen', name: 'Logo Generator', description: 'Logo concepts from descriptions', category: 'Creative',
    icon: 'Hexagon', defaultWidth: 700, defaultHeight: 500, minWidth: 400, minHeight: 350,
    component: LogoGenerator, requiresWebGPU: true,
  },
  {
    id: 'poemgen', name: 'Poem Generator', description: 'Poems in various styles', category: 'Creative',
    icon: 'PenTool', defaultWidth: 600, defaultHeight: 500, minWidth: 350, minHeight: 350,
    component: PoemGenerator, requiresWebGPU: true,
  },
  {
    id: 'resumebuilder', name: 'Resume Builder', description: 'AI resume creation', category: 'Creative',
    icon: 'FileUser', defaultWidth: 750, defaultHeight: 600, minWidth: 450, minHeight: 400,
    component: ResumeBuilder, requiresWebGPU: true,
  },
  {
    id: 'mindmapgen', name: 'Mind Map Gen', description: 'Visual mind maps from topics', category: 'Creative',
    icon: 'Network', defaultWidth: 800, defaultHeight: 600, minWidth: 500, minHeight: 400,
    component: MindMapGenerator, requiresWebGPU: true,
  },
];

export function getAppById(id: string): AppDefinition | undefined {
  return appRegistry.find((a) => a.id === id);
}

export function getAppsByCategory(category: AppCategory): AppDefinition[] {
  return appRegistry.filter((a) => a.category === category);
}

export function searchApps(query: string): AppDefinition[] {
  const q = query.toLowerCase();
  return appRegistry.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
  );
}
