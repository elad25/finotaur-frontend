import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlan } from "@/contexts/PlanContext";

const Options = () => {
  const navigate = useNavigate();
  const { canAccess } = usePlan();

  if (!canAccess("options")) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Options Trading</h1>
            <p className="text-muted-foreground">Advanced options analysis and flow data</p>
          </div>
        </div>

        {/* Locked State */}
        <Card className="shadow-premium border-primary/30 bg-gradient-best-value">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="text-primary" size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Elite Feature</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Options trading tools including options chain, flow data, and dark pool analytics are exclusive to Elite plan members.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/app/dashboard")}>
                Back to Dashboard
              </Button>
              <Button className="glow-primary" onClick={() => navigate("/pricing")}>
                Upgrade to Elite
              </Button>
            </div>
            <div className="mt-8 p-4 rounded-lg bg-card/50 border border-border max-w-md mx-auto">
              <h3 className="font-bold mb-3">Elite Features Include:</h3>
              <ul className="text-sm text-left space-y-2 text-muted-foreground">
                <li>✓ Real-time options chain</li>
                <li>✓ Options flow & unusual activity</li>
                <li>✓ Dark pool data</li>
                <li>✓ Advanced Greeks calculator</li>
                <li>✓ Multi-leg strategy builder</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Options Trading</h1>
          <p className="text-muted-foreground">Advanced options analysis and flow data</p>
        </div>
        <Badge className="bg-gradient-premium text-primary-foreground px-4 py-2">
          ELITE
        </Badge>
      </div>

      {/* Options content would go here */}
      <Card className="shadow-premium border-border">
        <CardHeader>
          <CardTitle>Options Chain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center bg-muted/20 rounded-lg border border-border">
            <p className="text-muted-foreground">Options chain interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Options;
