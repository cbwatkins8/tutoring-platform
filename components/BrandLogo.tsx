import Image from "next/image";

type BrandLogoProps = {
  className?: string;
};

/**
 * Compact, accessible brand lockup for the existing site headers.
 * The full supplied logo remains available at /brand/take-two-tutoring-logo.png.
 */
export default function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5">
        <Image
          src="/brand/take-two-tutoring-mark.png"
          alt=""
          width={36}
          height={31}
          className="h-auto w-full -translate-x-[2px] -translate-y-[2px]"
          aria-hidden="true"
          priority
        />
      </span>
      <span>Take Two Tutoring</span>
    </span>
  );
}
