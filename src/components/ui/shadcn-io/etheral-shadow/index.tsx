'use client';

import React, { useRef, useId, useEffect, useState, type CSSProperties } from 'react';
import { animate, useMotionValue, type AnimationPlaybackControls } from 'framer-motion';
import { cn } from '@/lib/utils';

// Type definitions
interface ResponsiveImage {
    src: string;
    alt?: string;
    srcSet?: string;
}

interface AnimationConfig {
    preview?: boolean;
    scale: number;
    speed: number;
}

interface NoiseConfig {
    opacity: number;
    scale: number;
}

export interface EtheralShadowProps {
    type?: 'preset' | 'custom';
    presetIndex?: number;
    customImage?: ResponsiveImage;
    sizing?: 'fill' | 'stretch';
    color?: string;
    animation?: AnimationConfig;
    noise?: NoiseConfig;
    style?: CSSProperties;
    className?: string;
    children?: React.ReactNode;
    useMask?: boolean;
    /** Reduce GPU load with performance optimizations (default: true) */
    optimizePerformance?: boolean;
}

function mapRange(
    value: number,
    fromLow: number,
    fromHigh: number,
    toLow: number,
    toHigh: number
): number {
    if (fromLow === fromHigh) {
        return toLow;
    }
    const percentage = (value - fromLow) / (fromHigh - fromLow);
    return toLow + percentage * (toHigh - toLow);
}

const useInstanceId = (): string => {
    const id = useId();
    const cleanId = id.replace(/:/g, "");
    const instanceId = `shadowoverlay-${cleanId}`;
    return instanceId;
};

export function EtheralShadow({
    sizing = 'fill',
    color = 'rgba(128, 128, 128, 1)',
    animation,
    noise,
    style,
    className,
    children,
    useMask = true,
    optimizePerformance = true
}: EtheralShadowProps) {
    const id = useInstanceId();
    const animationEnabled = animation && animation.scale > 0;
    const feColorMatrixRef = useRef<SVGFEColorMatrixElement>(null);
    const hueRotateMotionValue = useMotionValue(180);
    const hueRotateAnimation = useRef<AnimationPlaybackControls | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    // Performance optimizations: adjust displacement scale for stronger effect
    const baseDisplacementScale = animation ? mapRange(animation.scale, 1, 100, 20, 100) : 0;
    const displacementScale = optimizePerformance
        ? Math.min(baseDisplacementScale * 0.8, 80) // Reduce by 20%, cap at 80px (stronger)
        : baseDisplacementScale;

    const baseAnimationDuration = animation ? mapRange(animation.speed, 1, 100, 1000, 50) : 1;
    const animationDuration = optimizePerformance
        ? Math.max(baseAnimationDuration * 1.1, 55) // Slow down by 10%, minimum 55ms (faster)
        : baseAnimationDuration;

    // Pause animations when not visible to save GPU resources
    useEffect(() => {
        if (!optimizePerformance || !containerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0 }
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [optimizePerformance]);

    useEffect(() => {
        if (feColorMatrixRef.current && animationEnabled && isVisible) {
            if (hueRotateAnimation.current) {
                hueRotateAnimation.current.stop();
            }
            hueRotateMotionValue.set(0);

            // Performance optimization: reduce update frequency
            const updateInterval = optimizePerformance ? 16 : 0; // ~60fps vs unlimited
            let lastUpdate = 0;

            hueRotateAnimation.current = animate(hueRotateMotionValue, 360, {
                duration: animationDuration / 25,
                repeat: Infinity,
                repeatType: "loop",
                repeatDelay: 0,
                ease: "linear",
                delay: 0,
                onUpdate: (value: number) => {
                    if (feColorMatrixRef.current) {
                        const now = performance.now();
                        if (!optimizePerformance || now - lastUpdate >= updateInterval) {
                            feColorMatrixRef.current.setAttribute("values", String(value));
                            lastUpdate = now;
                        }
                    }
                }
            });

            return () => {
                if (hueRotateAnimation.current) {
                    hueRotateAnimation.current.stop();
                }
            };
        } else if (hueRotateAnimation.current && !isVisible) {
            // Pause animation when not visible
            hueRotateAnimation.current.pause();
        }
    }, [animationEnabled, animationDuration, hueRotateMotionValue, isVisible, optimizePerformance]);

    // Performance optimization: reduce blur and simplify filter
    const blurAmount = optimizePerformance ? '3px' : '4px'; // Slightly more blur for stronger effect
    const numOctaves = optimizePerformance ? '2' : '2'; // Keep turbulence complexity for stronger effect

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden w-full h-full", className)}
            style={style}
        >
            <div
                style={{
                    position: "absolute",
                    inset: -displacementScale,
                    filter: animationEnabled && isVisible ? `url(#${id}) blur(${blurAmount})` : "none",
                    // Performance: Use GPU acceleration hints
                    willChange: animationEnabled ? 'filter' : 'auto',
                    transform: 'translateZ(0)', // Force GPU layer
                }}
            >
                {animationEnabled && (
                    <svg style={{ position: "absolute" }}>
                        <defs>
                            <filter id={id} colorInterpolationFilters="sRGB">
                                <feTurbulence
                                    result="undulation"
                                    numOctaves={numOctaves}
                                    baseFrequency={optimizePerformance
                                        ? `${mapRange(animation.scale, 0, 100, 0.0012, 0.0006)},${mapRange(animation.scale, 0, 100, 0.005, 0.0025)}`
                                        : `${mapRange(animation.scale, 0, 100, 0.001, 0.0005)},${mapRange(animation.scale, 0, 100, 0.004, 0.002)}`
                                    }
                                    seed="0"
                                    type="turbulence"
                                />
                                <feColorMatrix
                                    ref={feColorMatrixRef}
                                    in="undulation"
                                    type="hueRotate"
                                    values="180"
                                />
                                {!optimizePerformance && (
                                    <feColorMatrix
                                        in="dist"
                                        result="circulation"
                                        type="matrix"
                                        values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
                                    />
                                )}
                                <feDisplacementMap
                                    in="SourceGraphic"
                                    in2={optimizePerformance ? "undulation" : "circulation"}
                                    scale={displacementScale}
                                    result={optimizePerformance ? "output" : "dist"}
                                />
                                {!optimizePerformance && (
                                    <feDisplacementMap
                                        in="dist"
                                        in2="undulation"
                                        scale={displacementScale}
                                        result="output"
                                    />
                                )}
                            </filter>
                        </defs>
                    </svg>
                )}
                <div
                    style={{
                        backgroundColor: color,
                        ...(useMask && {
                            maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
                            maskSize: sizing === "stretch" ? "100% 100%" : "cover",
                            maskRepeat: "no-repeat",
                            maskPosition: "center"
                        }),
                        width: "100%",
                        height: "100%"
                    }}
                />
            </div>

            {children && (
                <div className="relative z-10 w-full h-full">
                    {children}
                </div>
            )}

            {noise && noise.opacity > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
                        backgroundSize: noise.scale * 200,
                        backgroundRepeat: "repeat",
                        opacity: noise.opacity / 2
                    }}
                />
            )}
        </div>
    );
}
