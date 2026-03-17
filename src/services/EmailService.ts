import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetEmail(email: string, token: string) {
  const resetLink = `${process.env.FRONTEND_URL}auth/reset-senha?token=${token}`;
    console.log(email, resetLink)
  const response = await resend.emails.send({
    from: "no-reply@comms.prodplan.com.br",
    to: email,
    subject: "Redefinição de senha",
    html: `
      <p>Você solicitou redefinir sua senha.</p>
      <p>Clique no link abaixo:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Esse link expira em 15 minutos.</p>
    `,
  });
  console.log(response)
}