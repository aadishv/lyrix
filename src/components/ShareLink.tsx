import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRef } from "react";
import { toast } from "sonner"; // Assuming Sonner is integrated

export function ShareLinkComponent({ link }: { link: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleCopy = async () => {
    if (inputRef.current) {
      await navigator.clipboard.writeText(inputRef.current.value);
      toast("Link copied!", {
        description: "The shareable link has been copied to your clipboard.",
      });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative flex items-center w-full">
        <Input
          ref={inputRef}
          value={link}
          readOnly
          type={"text"}
        />
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={() => void handleCopy()}>Copy Link</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
