import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Lock, Check } from "lucide-react";

const Billing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { plan = "basic", email = "", name = "" } = location.state || {};

  const [cardData, setCardData] = useState({
    cardNumber: "",
    expiration: "",
    cvc: "",
    nameOnCard: "",
    billingAddress: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);

  const planDetails = {
    basic: { name: "Basic", price: "$23.99", tagline: "Perfect for new investors" },
    pro: { name: "Pro", price: "$49.99", tagline: "Most Popular - Everything serious traders need" },
    elite: { name: "Elite", price: "$89.99", tagline: "For power users who want it all" },
  };

  const selectedPlan = planDetails[plan as keyof typeof planDetails] || planDetails.basic;

  const handleCardNumberChange = (value: string) => {
    const formatted = value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();
    setCardData({ ...cardData, cardNumber: formatted });
  };

  const handleExpirationChange = (value: string) => {
    const formatted = value.replace(/\D/g, "").replace(/(\d{2})(\d{0,2})/, "$1/$2").slice(0, 5);
    setCardData({ ...cardData, expiration: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate payment processing
    setTimeout(() => {
      toast({
        title: "Trial activated successfully! 🎉",
        description: "Your 14-day free trial has started. Welcome to TraderHUB!",
      });
      setLoading(false);
      // Navigate to dashboard
      navigate("/app/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen px-4 py-12 gradient-hero">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Activate Your Free Trial</h1>
          <p className="text-muted-foreground">
            Enter your payment details to start your 14-day free trial
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            You won't be charged until your trial ends
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Payment Form */}
          <Card className="md:col-span-2 p-8 bg-card border-border shadow-premium">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="text-primary" />
              <h2 className="text-xl font-bold">Payment Information</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card Number */}
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardData.cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  maxLength={19}
                  required
                  className="mt-1"
                />
              </div>

              {/* Expiration & CVC */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiration">Expiration</Label>
                  <Input
                    id="expiration"
                    type="text"
                    placeholder="MM/YY"
                    value={cardData.expiration}
                    onChange={(e) => handleExpirationChange(e.target.value)}
                    maxLength={5}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    type="text"
                    placeholder="123"
                    value={cardData.cvc}
                    onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    maxLength={4}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Name on Card */}
              <div>
                <Label htmlFor="nameOnCard">Name on Card</Label>
                <Input
                  id="nameOnCard"
                  type="text"
                  placeholder={name || "John Trader"}
                  value={cardData.nameOnCard}
                  onChange={(e) => setCardData({ ...cardData, nameOnCard: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              {/* Billing Address */}
              <div>
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Input
                  id="billingAddress"
                  type="text"
                  placeholder="123 Wall Street"
                  value={cardData.billingAddress}
                  onChange={(e) => setCardData({ ...cardData, billingAddress: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="New York"
                    value={cardData.city}
                    onChange={(e) => setCardData({ ...cardData, city: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="NY"
                    value={cardData.state}
                    onChange={(e) => setCardData({ ...cardData, state: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    placeholder="10005"
                    value={cardData.zipCode}
                    onChange={(e) => setCardData({ ...cardData, zipCode: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <Label htmlFor="country">Country</Label>
                <Select value={cardData.country} onValueChange={(value) => setCardData({ ...cardData, country: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="ca">Canada</SelectItem>
                    <SelectItem value="au">Australia</SelectItem>
                    <SelectItem value="de">Germany</SelectItem>
                    <SelectItem value="fr">France</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4">
                <Lock size={16} className="text-primary" />
                <span>Your payment information is secure and encrypted</span>
              </div>

              <Button 
                type="submit" 
                className="w-full glow-primary" 
                disabled={loading}
              >
                {loading ? "Processing..." : "Activate My Free Trial"}
              </Button>
            </form>
          </Card>

          {/* Order Summary */}
          <Card className="p-6 bg-card border-border shadow-premium h-fit sticky top-6">
            <h3 className="text-lg font-bold mb-4">Order Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{selectedPlan.name} Plan</span>
                  <span className="text-primary font-bold text-xl">{selectedPlan.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedPlan.tagline}</p>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Trial Period</span>
                  <span className="font-medium">14 Days</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Due Today</span>
                  <span className="font-bold text-lg text-success">$0.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">After Trial</span>
                  <span className="font-medium">{selectedPlan.price}/month</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex items-start gap-2">
                <Check size={16} className="text-success mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Full access to all features</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={16} className="text-success mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Cancel anytime before trial ends</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={16} className="text-success mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">No commitment required</span>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 text-xs text-muted-foreground">
              <p>
                You will be charged {selectedPlan.price} per month after your 14-day trial ends. 
                You can cancel or change your plan at any time.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Billing;
