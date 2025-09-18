import { ReactNode } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export default function Confirm({
  onConfirm,
  message,
  action,
  disabled,
  children,
}: {
  onConfirm: () => void;
  message: string;
  children: ReactNode;
  action: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return <span>{children}</span>;
  }
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={onConfirm} variant="destructive">
            {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
