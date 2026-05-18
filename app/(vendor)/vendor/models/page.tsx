"use client";

import { motion } from "framer-motion";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MyModelsList } from "@/components/studio/my-models-list";

export default function VendorModelsPage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-10 w-10 text-primary" />
            Mis Modelos
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Gestiona tus modelos y revisa el estado de las solicitudes
          </p>
        </div>
        <Link href="/vendor/models/new">
          <Button variant="gradient" size="lg">
            <Plus className="h-5 w-5" />
            Nueva Modelo
          </Button>
        </Link>
      </motion.div>

      <MyModelsList />
    </div>
  );
}
