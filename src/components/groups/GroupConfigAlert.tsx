import { AlertTriangle, ArrowRight, Users2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface GroupConfigAlertProps {
  groupsWithoutUnits: number;
  totalGroups: number;
}

export const GroupConfigAlert = ({
  groupsWithoutUnits,
  totalGroups,
}: GroupConfigAlertProps) => {
  const navigate = useNavigate();

  if (groupsWithoutUnits === 0) return null;

  const allGroupsEmpty = groupsWithoutUnits === totalGroups;

  return (
    <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-700 dark:text-amber-400">
        {allGroupsEmpty
          ? "Grupos sem unidades atribuídas"
          : `${groupsWithoutUnits} grupo(s) sem unidades`}
      </AlertTitle>
      <AlertDescription className="text-amber-600 dark:text-amber-300/80">
        <p className="mb-3">
          {allGroupsEmpty
            ? "Nenhum grupo possui unidades vinculadas. Os moradores não poderão ver mensagens segmentadas."
            : `Existem ${groupsWithoutUnits} grupos que não possuem unidades vinculadas.`}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-500/50 hover:bg-amber-500/20"
          onClick={() => navigate("/dashboard/block-groups")}
        >
          <Users2 className="h-4 w-4" />
          Atribuir Unidades aos Grupos
          <ArrowRight className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};
