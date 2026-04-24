import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";

interface ResourceStepProps {
  assignedCredits: number;
  availableCredits: number;
  onChange: (value: number) => void;
}

export function ResourceStep({ assignedCredits, availableCredits, onChange }: ResourceStepProps) {
  const { user } = useAuthStore();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Asignación de Recursos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="assigned_credits">Cuota de Fotos Diaria para la Modelo</Label>
          <Input
            id="assigned_credits"
            type="number"
            min={1}
            max={availableCredits}
            value={assignedCredits}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder="Ej: 30"
          />
          <p className="text-xs text-muted-foreground italic">
            Límite disponible: <strong>{availableCredits}</strong> fotos. 
          </p>
        </div>
      </CardContent>
    </Card>
  );
}