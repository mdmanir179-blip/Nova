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
  const [imagePrompt, setImagePrompt] = useState<string>('Futuristic cyberpunk holographic drone flying over Dhaka megacity at night');
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('1:1');
  const [imageStyle, setImageStyle] = useState<string>('cinematic 8k photorealistic');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [isGeneratingImg, setIsGeneratingImg] = useState<boolean>(false);

  // Upload & Customization State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [customEditPrompt, setCustomEditPrompt] = useState<string>('Add neon glowing cybernetic visor and enhance luxury cinematic lighting');
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
  const [productIdea, setProductIdea] = useState<string>('স্মার্ট এআই চশমা যা চোখের পলকে বাংলা অনুবাদ ও রিয়েল-টাইম তথ্য দেখায় (Smart AI Glasses)');
  const [productCategory, setProductCategory] = useState<string>('Wearable Tech');
  const [isCreatingProduct, setIsCreatingProduct] = useState<boolean>(false);
  const [createdProduct, setCreatedProduct] = useState<any>(null);
  const [productMockupImg, setProductMockupImg] = useState<string>('');

  // 3. Video Editor State
  const [videoTitle, setVideoTitle] = useState<string>('AI Assistants: The Future of Productivity in 2026');
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
          instruction: customEditPrompt,
        }),
      });
      const data = await res.json();
      if (data.customizedImageUrl) {
        setCustomizedResult(data.customizedImageUrl);
      }
    } catch (err) {
      console.error('Customize error:', err);
    } finally {
      setIsCustomizingImg(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!productIdea.trim()) return;
    setIsCreatingProduct(true);
    soundFX.playActivateSound();

    try {
      const res = await fetch('/api/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: productIdea,
          category: productCategory,
          language: 'Bengali / English',
        }),
      });
      const data = await res.json();
      if (data.product) {
        setCreatedProduct(data.product);
        if (data.productImage) {
          setProductMockupImg(data.productImage);
        }
      }
    } catch (err) {
      console.error('Product creation error:', err);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleGenerateVideoStoryboard = async () => {
    if (!videoTitle.trim()) return;
    setIsDirectingVideo(true);
    soundFX.playActivateSound();

    try {
      const res = await fetch('/api/video-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoTitle,
          format: videoFormat,
          tone: videoTone,
          durationSeconds: videoDuration,
          language: 'Bengali / English',
        }),
      });
      const data = await res.json();
      if (data.scenes) {
        setVideoScriptData(data);
        setActiveSceneIdx(0);
      }
    } catch (err) {
      console.error('Video editor error:', err);
    } finally {
      setIsDirectingVideo(false);
    }
  };

  const playSceneVoiceover = (text: string) => {
    soundFX.playClick();
    SpeechService.speak(text, { rate: 1.05 });
  };

  return (
    <div className="space-y-6">
      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 w-fit">
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
          <span>ইমেজ তৈরি ও কাস্টমাইজেশন (Image Studio)</span>
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
          <span>প্রোডাক্ট ক্রিয়েটর (Product Creator)</span>
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
          <span>ভিডিও এডিটর ও স্টোরিবোর্ড (Video Director)</span>
        </button>
      </div>

      {/* 1. IMAGE STUDIO TAB */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section A: Generate Image from Prompt */}
          <div className="lg:col-span-6 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              টেক্সট থেকে ইমেজ তৈরি (Generate New Image)
            </h4>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">প্রম্পট লিখুন (Prompt)</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                placeholder="Describe your vision..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">অ্যাসপেক্ট রেশিও (Aspect Ratio)</label>
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
                <label className="text-xs text-neutral-400 block mb-1">ভিজুয়াল স্টাইল (Style)</label>
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
              <span>{isGeneratingImg ? 'ইমেজ তৈরি হচ্ছে...' : 'ইমেজ জেনারেট করুন (Generate)'}</span>
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
                    download="nova-generated-art.png"
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
              <Sliders size={16} className="text-purple-400" />
              ইমেজ আপলোড ও কাস্টমাইজেশন (Upload & Customize)
            </h4>

            {/* File Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 hover:border-cyan-500/60 rounded-xl p-5 text-center cursor-pointer transition-colors bg-neutral-950/40"
            >
              <Upload size={24} className="mx-auto text-neutral-400 mb-2" />
              <p className="text-xs text-neutral-300 font-medium">
                {uploadedImage ? 'অন্য ছবি আপলোড করতে ক্লিক করুন' : 'ছবি আপলোড করতে এখানে ক্লিক করুন (JPG, PNG, WEBP)'}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1">Upload your own photo to customize</p>
            </div>

            {uploadedImage && (
              <div className="space-y-4">
                {/* Live Preview with Filter Style */}
                <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 p-2 relative flex items-center justify-center">
                  <img
                    src={customizedResult || uploadedImage}
                    alt="Upload preview"
                    className="w-full max-h-60 object-contain rounded-lg transition-all"
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg) blur(${blurVal}px)`,
                    }}
                  />
                  {customizedResult && (
                    <span className="absolute top-4 right-4 px-2.5 py-1 rounded-md text-[10px] bg-purple-500/90 text-white font-mono shadow-md">
                      AI Customized
                    </span>
                  )}
                </div>

                {/* AI Customization Prompt */}
                <div>
                  <label className="text-xs text-neutral-300 block mb-1">
                    কাস্টমাইজ করার নির্দেশ (Customization Instruction)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customEditPrompt}
                      onChange={(e) => setCustomEditPrompt(e.target.value)}
                      placeholder="e.g. Add futuristic glowing cyber visor, modern background"
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={handleCustomizeImage}
                      disabled={isCustomizingImg}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-500 hover:bg-purple-400 text-white transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                    >
                      {isCustomizingImg ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                      <span>{isCustomizingImg ? 'কাজ চলছে...' : 'AI Edit'}</span>
                    </button>
                  </div>
                </div>

                {/* Live Filter Controls */}
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5 text-xs">
                  <span className="text-[11px] text-neutral-400 font-medium block">
                    রিয়েল-টাইম কালার ও ফিল্টার অ্যাডজাস্টমেন্ট (Live Adjustments):
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span>Brightness</span>
                        <span>{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-neutral-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span>Contrast</span>
                        <span>{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-neutral-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span>Saturation</span>
                        <span>{saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="250"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        className="w-full accent-purple-400 h-1 bg-neutral-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                        <span>Hue Shift</span>
                        <span>{hueRotate}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={hueRotate}
                        onChange={(e) => setHueRotate(Number(e.target.value))}
                        className="w-full accent-purple-400 h-1 bg-neutral-800 rounded-lg"
                      />
                    </div>
                  </div>
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
              প্রোডাক্ট আইডিয়া থেকে সম্পূর্ণ লঞ্চ প্যাকেজ
            </h4>
            <p className="text-xs text-neutral-400">
              যে কোনো আইডিয়া লিখুন। NOVA AI আপনার জন্য ব্র্যান্ড নাম, ট্যাগলাইন, ফিচার, মার্কেটিং হুক ও 3D মকআপ তৈরি করবে।
            </p>

            <div>
              <label className="text-xs text-neutral-300 block mb-1">প্রোডাক্টের আইডিয়া (Product Idea) *</label>
              <textarea
                value={productIdea}
                onChange={(e) => setProductIdea(e.target.value)}
                rows={3}
                placeholder="যেমন: স্মার্ট পানি বোতল যা তাপমাত্রা ও হাইড্রেটিং ট্র্যাকিং করে..."
                className="w-full text-xs p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-purple-500/50 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 block mb-1">ক্যাটাগরি (Category)</label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-purple-500/50"
              >
                <option value="Wearable Tech & IoT">Wearable Tech & IoT</option>
                <option value="Smart Home Appliance">Smart Home Appliance</option>
                <option value="Eco Lifestyle Goods">Eco Lifestyle Goods</option>
                <option value="Health & Wellness">Health & Wellness</option>
                <option value="Fashion & Accessories">Fashion & Accessories</option>
              </select>
            </div>

            <button
              onClick={handleCreateProduct}
              disabled={isCreatingProduct}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-purple-500 hover:bg-purple-400 text-white transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreatingProduct ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{isCreatingProduct ? 'প্রোডাক্ট ডিজাইন হচ্ছে...' : 'Create Full Product (তৈরি করুন)'}</span>
            </button>
          </div>

          <div className="lg:col-span-7 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            {createdProduct ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-purple-400 tracking-wider">
                      NEW PRODUCT BLUEPRINT
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">{createdProduct.name}</h3>
                    <p className="text-xs text-neutral-300 italic">{createdProduct.tagline}</p>
                  </div>
                  {createdProduct.priceEstimate && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-sm font-bold">
                      {createdProduct.priceEstimate}
                    </span>
                  )}
                </div>

                {productMockupImg && (
                  <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 p-1">
                    <img
                      src={productMockupImg}
                      alt="Product Mockup"
                      className="w-full h-56 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 text-xs text-neutral-300">
                  <span className="font-semibold text-white block mb-1">Product Overview:</span>
                  {createdProduct.overview}
                </div>

                {/* Key Features */}
                {createdProduct.keyFeatures && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-white">শীর্ষ ফিচারসমূহ (Key Features):</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {createdProduct.keyFeatures.map((feat: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs">
                          <span className="font-semibold text-purple-300 block">
                            {typeof feat === 'string' ? feat : feat.title || feat.name}
                          </span>
                          {feat.description && (
                            <span className="text-neutral-400 text-[11px] mt-0.5 block">
                              {feat.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marketing Angles */}
                {createdProduct.marketingAngles && (
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-xs space-y-1.5">
                    <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                      <Sparkles size={12} />
                      হাই-কনভার্টিং বিজ্ঞাপন হুক (Ad Hooks):
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-neutral-300">
                      {createdProduct.marketingAngles.map((hook: string, i: number) => (
                        <li key={i}>{hook}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-neutral-500 text-xs">
                প্রোডাক্টের বিবরণ ও আইডিয়া ইনপুট দিয়ে "Create Full Product" বাটনে ক্লিক করুন।
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. VIDEO DIRECTOR & STORYBOARD TAB */}
      {activeTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Film size={16} className="text-rose-400" />
              ভিডিও এডিটর ও স্টোরিবোর্ড ডিরেক্টর
            </h4>
            <p className="text-xs text-neutral-400">
              সোশ্যাল মিডিয়া রিল বা ইউটিউব ভিডিওর সম্পূর্ণ দৃশ্য বিন্যাস, ভয়েসওভার স্ক্রিপ্ট ও ট্রানজিশন তৈরি করুন।
            </p>

            <div>
              <label className="text-xs text-neutral-300 block mb-1">ভিডিওর বিষয়বস্তু (Video Topic) *</label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. 3 AI tools that will save you 10 hours this week"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-300 block mb-1">ভিডিও ফরম্যাট (Format)</label>
                <select
                  value={videoFormat}
                  onChange={(e) => setVideoFormat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="Reels / TikTok (9:16)">Reels / TikTok (9:16)</option>
                  <option value="YouTube Shorts (9:16)">Shorts (9:16)</option>
                  <option value="YouTube Landscape (16:9)">Landscape (16:9)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-300 block mb-1">ভিডিওর টোন (Tone)</label>
                <select
                  value={videoTone}
                  onChange={(e) => setVideoTone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="High-Energy Cyberpunk">High-Energy Cyberpunk</option>
                  <option value="Educational & Direct">Educational & Direct</option>
                  <option value="Dramatic & Storytelling">Dramatic & Storytelling</option>
                  <option value="Commercial Sleek">Commercial Sleek</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateVideoStoryboard}
              disabled={isDirectingVideo}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDirectingVideo ? <RefreshCw size={14} className="animate-spin" /> : <Film size={14} />}
              <span>{isDirectingVideo ? 'স্টোরিবোর্ড তৈরি হচ্ছে...' : 'Generate Video Storyboard'}</span>
            </button>
          </div>

          <div className="lg:col-span-7 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            {videoScriptData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">{videoScriptData.videoTitle}</h4>
                    <span className="text-xs text-rose-400 font-mono">
                      Hook: "{videoScriptData.hookScript}"
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                    {videoScriptData.aspectRatio}
                  </span>
                </div>

                {/* Animated Interactive Scene Player Simulation */}
                <div className="relative rounded-2xl border border-neutral-800 bg-neutral-950 p-6 overflow-hidden flex flex-col items-center justify-center min-h-56 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-950/20 via-black to-neutral-950" />
                  
                  {videoScriptData.scenes?.[activeSceneIdx] && (
                    <div className="relative z-10 space-y-3 max-w-lg">
                      <div className="flex items-center justify-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          SCENE {activeSceneIdx + 1} OF {videoScriptData.scenes.length}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">
                          {videoScriptData.scenes[activeSceneIdx].durationSec}s
                        </span>
                      </div>

                      <div className="text-lg font-bold text-cyan-200">
                        "{videoScriptData.scenes[activeSceneIdx].onScreenText}"
                      </div>

                      <p className="text-xs text-neutral-300 bg-black/60 p-3 rounded-xl border border-neutral-800">
                        <span className="text-neutral-500 block text-[10px] uppercase font-mono mb-1">
                          VISUAL ON SCREEN:
                        </span>
                        {videoScriptData.scenes[activeSceneIdx].visualPrompt}
                      </p>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => playSceneVoiceover(videoScriptData.scenes[activeSceneIdx].voiceover)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                        >
                          <Volume2 size={13} />
                          <span>Play Voiceover</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Scene Navigation bar */}
                  <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-xs text-neutral-400">
                    <button
                      disabled={activeSceneIdx === 0}
                      onClick={() => setActiveSceneIdx(Math.max(0, activeSceneIdx - 1))}
                      className="hover:text-white disabled:opacity-30"
                    >
                      ← Previous Scene
                    </button>
                    <span className="font-mono text-[11px]">
                      {activeSceneIdx + 1} / {videoScriptData.scenes?.length}
                    </span>
                    <button
                      disabled={activeSceneIdx >= (videoScriptData.scenes?.length || 1) - 1}
                      onClick={() => setActiveSceneIdx(Math.min(videoScriptData.scenes.length - 1, activeSceneIdx + 1))}
                      className="hover:text-white disabled:opacity-30"
                    >
                      Next Scene →
                    </button>
                  </div>
                </div>

                {/* Timeline Scene List */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white">টাইমলাইন সিকোয়েন্স (Scenes Timeline):</span>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {videoScriptData.scenes?.map((scene: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => setActiveSceneIdx(i)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          activeSceneIdx === i
                            ? 'border-rose-500/50 bg-neutral-900'
                            : 'border-neutral-800/80 bg-neutral-950/60 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-white">
                            Scene {scene.sceneNumber || i + 1} ({scene.durationSec}s)
                          </span>
                          <span className="text-[10px] text-rose-300 font-mono">
                            {scene.transition}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300 line-clamp-2">
                          Voiceover: "{scene.voiceover}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-neutral-500 text-xs">
                ভিডিওর টপিক লিখে "Generate Video Storyboard" বাটনে ক্লিক করুন।
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
