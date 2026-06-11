import re

file_path = "src/components/AlexPlayer.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove swipe-to-fullscreen drag logic
content = re.sub(
    r'const dt = Date\.now\(\) - touchStartRef\.current\.time;.*?touchStartRef\.current = null;',
    'touchStartRef.current = null;',
    content,
    flags=re.DOTALL
)

# 2. Player Geometry and Injected Style
content = re.sub(
    r'className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-\[0_20px_50px_rgba\(0,0,0,0\.8\)\] border border-white/10 select-none group/player touch-manipulation"',
    'className={elative w-full aspect-video bg-black select-none group/player touch-manipulation flex flex-col justify-center }',
    content
)

injected_style = """
        <style dangerouslySetInnerHTML={{__html: 
          #alex-player-video::cue {
            font-size: % !important;
            background:  !important;
            background-color:  !important;
            color: #ffffff !important;
            text-shadow:  !important;
            font-family: '', 'Outfit', sans-serif !important;
          }
          #alex-player-video::-webkit-media-text-track-container {
            transform: translateY() !important;
            transition: transform 0.3s ease-in-out;
          }
        }} />
"""
content = content.replace(
    '{/* Dynamic Glow Overlay */}',
    injected_style + '\n        {/* Dynamic Glow Overlay */}'
)

# 3. Video element id and style removal
old_video_style = r"""style={{
            '--sub-size': ${subtitleSize}%,
            '--sub-bg': showSubtitleBg \? 'rgba\(0, 0, 0, 0\.65\)' : 'transparent',
            '--sub-shadow': showSubtitleBg \? 'none' : '0 2px 4px rgba\(0, 0, 0, 0\.95\), 0 0 8px rgba\(0, 0, 0, 0\.95\)',
            '--sub-font': '', 'Outfit', sans-serif,
            '--sub-offset-y': isZoomed \? '-12vh' : '-24px'
          } as React\.CSSProperties}"""

content = re.sub(old_video_style, '', content)
content = content.replace('<video\n          ref={videoRef}', '<video\n          id="alex-player-video"\n          ref={videoRef}')

# 4. Controls Background & Layout
content = content.replace(
    'p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-4 transition-all duration-300 transform z-30 ',
    'px-3 py-3 md:px-6 md:py-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 md:gap-4 transition-all duration-300 transform z-30 '
)

# 5. Dropdowns Layout & Overscroll
content = content.replace('max-h-[65vh] overflow-y-auto liquid-glass-heavy', 'max-h-[50vh] overflow-y-auto ios-glass overscroll-contain')
content = content.replace('max-h-[60vh] overflow-y-auto liquid-glass-heavy', 'max-h-[50vh] overflow-y-auto ios-glass overscroll-contain')

# 6. Zoom and Fullscreen Icons
zoom_old = r"""              {/\* Zoom Fill Toggle \*/}
              <button 
                onClick={\(\) => setIsZoomed\(!isZoomed\)} 
                className="text-white hover:text-alex-primary text-base md:text-xl transition-colors cursor-pointer w-6 h-6 flex items-center justify-center ml-1 md:ml-0"
                title=\{isZoomed \? "تصغير للاحتواء" : "تكبير لملء الشاشة"\}
              >
                <i className=\{a-solid \$\{isZoomed \? 'fa-compress' : 'fa-expand'\}\}></i>
              </button>"""

zoom_new = """              {/* Zoom Toggle */}
              <div 
                onClick={() => setIsZoomed(!isZoomed)} 
                className="flex items-center justify-center w-6 h-6 ml-1 md:ml-0 cursor-pointer group/zoom"
                title={isZoomed ? "تصغير للاحتواء" : "تكبير لملء الشاشة"}
              >
                <i className={a-solid  text-white group-hover/zoom:text-alex-primary text-base md:text-xl transition-transform duration-300 transform group-hover/zoom:scale-125}></i>
              </div>"""
content = re.sub(zoom_old, zoom_new, content)


fs_old = r"""              {/\* Fullscreen Toggle \*/}
              <button 
                onClick=\{toggleFullscreen\} 
                className="text-white hover:text-alex-primary text-base md:text-xl transition-colors cursor-pointer w-6 h-6 flex items-center justify-center ml-1 md:ml-0"
              >
                <i className=\{a-solid \$\{isFullscreen \? 'fa-minimize' : 'fa-maximize'\}\}></i>
              </button>"""

fs_new = """              {/* Fullscreen Toggle */}
              <div 
                onClick={toggleFullscreen} 
                className="flex items-center justify-center w-6 h-6 ml-1 md:ml-0 cursor-pointer group/fs"
                title="ملء الشاشة"
              >
                <i className={a-solid  text-white group-hover/fs:text-alex-primary text-base md:text-xl transition-transform duration-300 transform group-hover/fs:scale-125}></i>
              </div>"""
content = re.sub(fs_old, fs_new, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("AlexPlayer.tsx refactored successfully.")
