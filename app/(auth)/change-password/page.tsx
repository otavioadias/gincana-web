import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { Card, PageHeading } from "@/components/ui";

export default function ChangePasswordPage() {
  return (
    <main className="standalone-page">
      <Card className="contract-gap-card">
        <LockKeyhole size={30} />
        <PageHeading
          eyebrow="Segurança"
          title="Troca de senha indisponível"
          description="A API atual ainda não publica uma rota para alteração de senha nem informa, em /me, quando a troca é obrigatória."
        />
        <p>Assim que o contrato do gincana-api disponibilizar esse fluxo, esta tela poderá ser conectada sem alterar os demais módulos.</p>
        <Link className="button button-secondary" href="/login">Voltar ao login</Link>
      </Card>
    </main>
  );
}
