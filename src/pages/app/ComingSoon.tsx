import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Construction, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ComingSoonProps {
  title: string;
  description: string;
}

const ComingSoon = ({ title, description }: ComingSoonProps) => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleNotify = () => {
    if (email) {
      toast({
        title: "You're on the list! 🎉",
        description: "We'll notify you when this feature launches.",
      });
      setEmail("");
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-premium">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">{description}</p>
          
          <div className="space-y-3 pt-4">
            <p className="text-sm font-medium text-center">Get notified when we launch</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleNotify()}
              />
              <Button onClick={handleNotify} disabled={!email}>
                <Mail size={16} className="mr-2" />
                Notify Me
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
