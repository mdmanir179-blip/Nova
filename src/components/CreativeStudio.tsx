import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Upload,
  Download,
  Film,
  ShoppingBag,
  Wand2,
  Play,
  Pause,
  RefreshCw,
  Layers,
  Check,
  Volume2
} from 'lucide-react';
import { soundFX, SpeechService } from '../utils/audioEngine';

export const CreativeStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'product' | 'video'>('image');

  // 1. Image Generator & Customizer State
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('1:1');
  const [imageStyle, setImageStyle] = useState<string>('cinematic 8k photorealistic');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [isGeneratingImg, setIsGeneratingImg] = useState<boolean>(false);

  // Upload & Customization State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [customEditPrompt, setCustomEditPrompt] = useState<string>('');
  const [isCustomizingImg, setIsCustomizingImg] = useState<boolean>(false);
  const [customizedResult, setCustomizedResult] = useState<string | null>(null);

  // Live Canvas Filters
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [hueRotate, setHueRotate] = useState<number>(0);
  const [blurVal, setBlurVal] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 2. Product Creator State
  const [productIdea, setProductIdea] = useState<string>('');
  const [productCategory, setProductCategory] = useState<string>('Wearable Tech & IoT');
  const [isCreatingProduct, setIsCreatingProduct] = useState<boolean>(false);
  const [createdProduct, setCreatedProduct] = useState<any>(null);
  const [productMockupImg, setProductMockupImg] = useState<string>('');

  // 3. Video Editor State
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoFormat, setVideoFormat] = useState<string>('Reels / TikTok (9:16)');
  const [videoTone, setVideoTone] = useState<string>('High-Energy Cyberpunk');
  const [videoDuration, setVideoDuration] = useState<number>(30);
  const [isDirectingVideo, setIsDirectingVideo] = useState<boolean>(false);
  const [videoScriptData, setVideoScriptData] = useState<any>(null);
  const [activeSceneIdx, setActiveSceneIdx] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  // Handlers
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImg(true);
    soundFX.playActivateSound();

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageAspectRatio,
          style: imageStyle,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (err) {
      console.error('Image generation error:', err);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setCustomizedResult(null);
      soundFX.playClick();
    };
    reader.readAsDataURL(file);
  };

  const handleCustomizeImage = async () => {
    if (!uploadedImage) return;
    setIsCustomizingImg(true);
    soundFX.playActivateSound();

    try {
      const res = await fetch('/api/customize-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadedImage,
          instruction: customEditPrompt || 'Enhance quality, lighting, and cinematic grade',
          filters: { brightness, contrast, saturation, hueRotate, blurVal },
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setCustomizedResult(data.imageUrl);
      } else {
        // Fallback: apply canvas filter directly
        applyCanvasFiltersToExport();
      }
    } catch (err) {
      console.error('Customize error:', err);
      applyCanvasFiltersToExport();
    } finally {
      setIsCustomizingImg(false);
    }
  };

  // Canvas filter exporter fallback
  const applyCanvasFiltersToExport = () => {
    if (!uploadedImage) return;
    const img = new Image();
    img.src = uploadedImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg) blur(${blurVal}px)`;
        ctx.drawImage(img, 0, 0);
        setCustomizedResult(canvas.toDataURL('image/png'));
      }
    };
  };

  // Product Creator Handler
  const handleCreateProduct = async () => {
    if (!productIdea.trim()) return;
    setIsCreatingProduct(true);
    soundFX.playActivateSound();

    try {
      const res = await fetch('/api/product/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: productIdea,
          category: productCategory,
        }),
      });
      const data = await res.json();
      setCreatedProduct(data);

      // Generate product visual mockup image
      const mockRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Commercial product mockup photography of ${data.name || productIdea}, ${data.tagline || ''}, sleek premium lighting, white pedestal background`,
          aspectRatio: '1:1',
          style: 'luxury commercial product photoshoot',
        }),
      });
      const mockData = await mockRes.json();
      if (mockData.imageUrl) {
        setProductMockupImg(mockData.imageUrl);
      }
    } catch (err) {
      console.error('Product creation error:', err);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Video Director Handler
  const handleDirectVideo = async () => {
    if (!videoTitle.trim()) return;
    setIsDirectingVideo(true);
    soundFX.playActivateSound();

    try {
      const res = await fetch('/api/video-editor/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: videoTitle,
          format: videoFormat,
          durationSeconds: videoDuration,
          tone: videoTone,
        }),
      });
      const data = await res.json();
      setVideoScriptData(data);
      setActiveSceneIdx(0);
    } catch (err) {
      console.error('Video director error:', err);
    } finally {
      setIsDirectingVideo(false);
    }
  };

  const handlePlayVoiceover = (text: string) => {
    soundFX.unlock();
    SpeechService.speak(text, {
      rate: 1.05,
      pitch: 1.0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Wand2 size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Creative Multimedia Studio</h3>
            <p className="text-xs text-neutral-400">
              Generate AI artwork, customize uploaded photos, architect product concepts, and direct video reels.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs switcher */}
      <div className="flex rounded-xl bg-neutral-900/80 p-1 border border-neutral-800 gap-1 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('image');
            soundFX.playClick();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'image'
              ? 'bg-cyan-500 text-neutral-950 shadow-md shadow-cyan-500/20'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ImageIcon size={15} />
          <span>Image Studio & Customizer</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('product');
            soundFX.playClick();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'product'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ShoppingBag size={15} />
          <span>Product Creator</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('video');
            soundFX.playClick();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'video'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Film size={15} />
          <span>Video Director & Storyboard</span>
        </button>
      </div>

      {/* 1. IMAGE STUDIO TAB */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section A: Generate Image from Prompt */}
          <div className="lg:col-span-6 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              Generate Image from Text Prompt
            </h4>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Prompt</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                placeholder="Describe your vision (e.g. A futuristic cybernetic assistant floating in a sleek glass office)..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Aspect Ratio</label>
                <select
                  value={imageAspectRatio}
                  onChange={(e) => setImageAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="1:1">1:1 (Square)</option>
                  <option value="16:9">16:9 (Landscape / YouTube)</option>
                  <option value="9:16">9:16 (Story / Reel)</option>
                  <option value="4:3">4:3 (Classic)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Visual Style</label>
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="cinematic 8k photorealistic">Cinematic Photorealistic</option>
                  <option value="cyberpunk neon lighting, octane render">Cyberpunk Neon</option>
                  <option value="3D Pixar character concept art">3D Stylized</option>
                  <option value="luxury commercial product photoshoot">Commercial Studio</option>
                  <option value="anime aesthetic makoto shinkai style">Anime Aesthetic</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImg}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGeneratingImg ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
              <span>{isGeneratingImg ? 'Generating Artwork...' : 'Generate AI Image'}</span>
            </button>

            {generatedImage && (
              <div className="mt-4 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 p-2">
                <img
                  src={generatedImage}
                  alt="Generated AI artwork"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="mt-2 flex justify-end">
                  <a
                    href={generatedImage}
                    download="ms-generated-art.png"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Upload & Customize Image */}
          <div className="lg:col-span-6 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload size={16} className="text-purple-400" />
              Upload & Customize Image
            </h4>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-800 hover:border-purple-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-neutral-950/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload size={24} className="mx-auto text-neutral-500 mb-1" />
              <p className="text-xs text-neutral-300 font-medium">Click to upload photo</p>
              <p className="text-[10px] text-neutral-500">Supports PNG, JPG, WEBP</p>
            </div>

            {uploadedImage && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {/* Original / Preview Image */}
                  <div className="flex-1 rounded-xl overflow-hidden border border-neutral-800 bg-black aspect-video flex items-center justify-center">
                    <img
                      src={customizedResult || uploadedImage}
                      alt="Uploaded"
                      style={{
                        filter: customizedResult
                          ? 'none'
                          : `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg) blur(${blurVal}px)`,
                      }}
                      className="max-h-52 object-contain"
                    />
                  </div>
                </div>

                {/* Live Adjustment Sliders */}
                <div className="space-y-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Brightness</span>
                    <span className="font-mono text-cyan-400">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-neutral-400">Contrast</span>
                    <span className="font-mono text-purple-400">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-purple-400"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-neutral-400">Saturation</span>
                    <span className="font-mono text-pink-400">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-pink-400"
                  />
                </div>

                {/* AI Custom Prompt for Photo Edit */}
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    AI Custom Edit Instruction
                  </label>
                  <input
                    type="text"
                    value={customEditPrompt}
                    onChange={(e) => setCustomEditPrompt(e.target.value)}
                    placeholder="e.g. Add cyberpunk neon background, dramatic rim light, 4K upscale"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCustomizeImage}
                    disabled={isCustomizingImg}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-purple-500 hover:bg-purple-400 text-white transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
                  >
                    {isCustomizingImg ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                    <span>{isCustomizingImg ? 'Applying Customization...' : 'Apply AI Customization'}</span>
                  </button>

                  {customizedResult && (
                    <a
                      href={customizedResult}
                      download="ms-customized-image.png"
                      className="px-3 py-2 rounded-xl text-xs bg-neutral-800 hover:bg-neutral-700 text-white flex items-center gap-1"
                    >
                      <Download size={13} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PRODUCT CREATOR TAB */}
      {activeTab === 'product' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShoppingBag size={16} className="text-purple-400" />
              Architect a Product Concept
            </h4>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Product Idea & Niche</label>
              <textarea
                value={productIdea}
                onChange={(e) => setProductIdea(e.target.value)}
                rows={3}
                placeholder="e.g. A holographic AI smart ring that tracks biometric health and controls smart home with subtle gestures..."
                className="w-full text-xs p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Industry Category</label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Wearable Tech & IoT">Wearable Tech & IoT</option>
                <option value="Software & SaaS Platform">Software & SaaS Platform</option>
                <option value="Consumer Electronics">Consumer Electronics</option>
                <option value="Eco-Friendly Lifestyle">Eco-Friendly Lifestyle</option>
                <option value="Luxury Fashion & Goods">Luxury Fashion & Goods</option>
              </select>
            </div>

            <button
              onClick={handleCreateProduct}
              disabled={isCreatingProduct || !productIdea.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-purple-500 hover:bg-purple-400 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-md shadow-purple-500/20"
            >
              {isCreatingProduct ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{isCreatingProduct ? 'Designing Product Concept...' : 'Generate Full Product Blueprint'}</span>
            </button>
          </div>

          <div className="lg:col-span-7 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white">Generated Product Blueprint</h4>

            {!createdProduct ? (
              <div className="py-20 text-center text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-xl">
                <ShoppingBag size={32} className="mx-auto text-neutral-700" />
                <p className="text-xs text-neutral-400 font-medium">No product created yet</p>
                <p className="text-[11px] text-neutral-500">
                  Enter your product idea on the left to generate name, specs, marketing copy, and photorealistic 3D mockup.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {productMockupImg && (
                  <div className="rounded-xl overflow-hidden border border-neutral-800 bg-black">
                    <img
                      src={productMockupImg}
                      alt={createdProduct.name}
                      className="w-full h-56 object-cover"
                    />
                  </div>
                )}

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">{createdProduct.name}</h3>
                    <span className="text-xs font-mono text-purple-400 font-semibold">
                      {createdProduct.targetPrice || '$299'}
                    </span>
                  </div>
                  <p className="text-xs text-purple-300 italic">{createdProduct.tagline}</p>
                  <p className="text-xs text-neutral-300 pt-2 leading-relaxed">
                    {createdProduct.description}
                  </p>

                  {createdProduct.keyFeatures && (
                    <div className="pt-3">
                      <span className="text-[11px] font-mono uppercase text-neutral-400 block mb-1.5 font-bold">
                        Core Features:
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
                        {createdProduct.keyFeatures.map((feat: string, i: number) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. VIDEO DIRECTOR TAB */}
      {activeTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Film size={16} className="text-rose-400" />
              Direct AI Video & Storyboard
            </h4>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Video Topic / Campaign Title</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. 5 AI Habits That Will Change Your Life in 2026"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Platform Format</label>
                <select
                  value={videoFormat}
                  onChange={(e) => setVideoFormat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Reels / TikTok (9:16)">Reels / TikTok (9:16)</option>
                  <option value="YouTube Longform (16:9)">YouTube (16:9)</option>
                  <option value="Square Feed (1:1)">Square Feed (1:1)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Video Tone</label>
                <select
                  value={videoTone}
                  onChange={(e) => setVideoTone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="High-Energy Cyberpunk">High-Energy Tech</option>
                  <option value="Inspirational & Cinematic">Inspirational Cinematic</option>
                  <option value="Educational & Direct">Educational & Sharp</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleDirectVideo}
              disabled={isDirectingVideo || !videoTitle.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-md shadow-rose-500/20"
            >
              {isDirectingVideo ? <RefreshCw size={14} className="animate-spin" /> : <Film size={14} />}
              <span>{isDirectingVideo ? 'Writing Storyboard...' : 'Direct & Script Video'}</span>
            </button>
          </div>

          <div className="lg:col-span-7 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white">Storyboard & Script Scenes</h4>

            {!videoScriptData ? (
              <div className="py-20 text-center text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-xl">
                <Film size={32} className="mx-auto text-neutral-700" />
                <p className="text-xs text-neutral-400 font-medium">No storyboard created</p>
                <p className="text-[11px] text-neutral-500">
                  Input a video topic on the left to produce full scene-by-scene visual cues, on-screen text, and voiceover scripts.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-white block">{videoScriptData.title}</span>
                    <span className="text-[10px] text-rose-400 font-mono">
                      Hook: "{videoScriptData.hook || 'Watch this!'}"
                    </span>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                    {videoScriptData.scenes?.length || 0} Scenes
                  </span>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {videoScriptData.scenes?.map((scene: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        activeSceneIdx === idx
                          ? 'bg-rose-950/20 border-rose-500/50'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono text-rose-400">
                          SCENE {idx + 1} • {scene.durationSeconds || '5'}s
                        </span>
                        <button
                          onClick={() => handlePlayVoiceover(scene.voiceoverScript)}
                          className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-rose-400 transition-colors"
                        >
                          <Volume2 size={13} />
                          <span>Voiceover Audio</span>
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="text-neutral-400">
                          <b className="text-neutral-200">Visual Prompt:</b> {scene.visualPrompt}
                        </div>
                        <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-rose-100 font-medium">
                          <b className="text-rose-400">Voiceover:</b> "{scene.voiceoverScript}"
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
