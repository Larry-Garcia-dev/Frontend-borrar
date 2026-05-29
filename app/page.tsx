"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Zap, Shield, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

const features = [
  {
    icon: Sparkles,
    title: "IA de Ultima Generacion",
    description: "Modelos avanzados que crean imagenes increibles a partir de texto",
  },
  {
    icon: Zap,
    title: "Generacion Rapida",
    description: "Obtiene tus imagenes en segundos, no minutos",
  },
  {
    icon: Shield,
    title: "Seguro y Privado",
    description: "Tus creaciones son tuyas, protegemos tu privacidad",
  },
  {
    icon: ImageIcon,
    title: "Alta Calidad",
    description: "Imagenes en alta resolucion listas para usar",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute -right-40 bottom-20 h-[400px] w-[400px] rounded-full bg-accent/20 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2"
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                Potenciado por Inteligencia Artificial
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              <span className="text-balance">Crea imagenes</span>{" "}
              <span className="gradient-text text-balance">increibles con IA</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground"
            >
              Transforma tus ideas en arte visual. Escribe lo que imaginas y deja
              que nuestra IA lo convierta en realidad en segundos.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link href="/register">
                <Button variant="gradient" size="xl" className="w-full sm:w-auto">
                  <Sparkles className="h-5 w-5" />
                  Comenzar Gratis
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Ya tengo cuenta
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Demo preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-20 max-w-5xl"
          >
            <div className="relative rounded-3xl border border-border/50 bg-card/50 p-2 shadow-2xl backdrop-blur-xl">
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-50 blur" />
              <div className="relative overflow-hidden rounded-2xl bg-background">
                <div className="flex items-center gap-2 border-b border-border bg-card/50 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="grid gap-6 p-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">Prompt</p>
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                      <p className="text-lg text-foreground">
                        &ldquo;Un paisaje surrealista con montanas flotantes, cascadas de cristal
                        y un cielo lleno de auroras boreales&rdquo;
                      </p>
                    </div>
                    <Button variant="gradient" className="w-full">
                      <Sparkles className="h-5 w-5" />
                      Generar Imagen
                    </Button>
                  </div>
                  <div className="flex items-center justify-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-8">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent">
                        <ImageIcon className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-muted-foreground">Tu imagen aparecera aqui</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold text-foreground">
              Por que elegir Macondo AI
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-muted-foreground">
              La mejor plataforma para crear arte con inteligencia artificial
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 transition-transform group-hover:scale-110">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-12 text-center text-white md:p-20"
          >
            <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <h2 className="relative text-4xl font-bold md:text-5xl">
              Comienza a crear hoy
            </h2>
            <p className="relative mx-auto mt-6 max-w-xl text-xl text-white/80">
              Unete a miles de creadores que ya usan Macondo AI para dar vida a
              sus ideas
            </p>
            <Link href="/register">
              <Button
                size="xl"
                className="relative mt-8 bg-white text-primary hover:bg-white/90"
              >
                <Sparkles className="h-5 w-5" />
                Crear cuenta gratis
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-muted-foreground">
            2024 Macondo AI. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
