import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetEmail(email: string, token: string) {
  const resetLink = `${process.env.FRONTEND_URL}auth/reset-senha?token=${token}`;
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
}

export async function sendWelcomEmail(email: string, senha: string) {
  const resetLink = `${process.env.FRONTEND_URL}auth/login`;
  const response = await resend.emails.send({
    from: "no-reply@comms.prodplan.com.br",
    to: email,
    subject: "Bem-vindo ao Prodplan",
    html: `
      <!DOCTYPE html>

<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo ao ProdPlan</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:40px;">


      <!-- Logo -->
      <tr>
        <td align="center" style="padding-bottom: 20px;">
          <h2 style="margin:0; color:#2b2f33;">ProdPlan</h2>
          <p style="margin:5px 0 0 0; color:#888;">Controle de Produção</p>
        </td>
      </tr>

      <!-- Título -->
      <tr>
        <td>
          <h1 style="color:#2b2f33; font-size:22px;">Bem-vindo ao ProdPlan!</h1>
          <p style="color:#555; font-size:15px;">
            Seu usuário foi criado e você já pode acessar o sistema.
          </p>
        </td>
      </tr>

      <!-- Box de acesso -->
      <tr>
        <td style="background:#f7f9fb; padding:20px; border-radius:6px; margin-top:20px;">
          <p style="margin:0; font-size:14px; color:#333;"><strong>Usuário:</strong> ${email}</p>
          <p style="margin:5px 0 15px 0; font-size:14px; color:#333;"><strong>Senha:</strong> ${senha}</p>
          
          <a href="${resetLink}" 
             style="display:inline-block; padding:12px 20px; background:#2b7cff; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">
             Acessar o ProdPlan
          </a>
        </td>
      </tr>

      <!-- Info -->
      <tr>
        <td style="padding-top:20px;">
          <p style="font-size:13px; color:#666;">
            Por segurança, recomendamos que você altere sua senha após o primeiro acesso.
            Você pode fazer isso a qualquer momento através da opção <strong>"Esqueci minha senha"</strong> na tela de login.
          </p>
        </td>
      </tr>

      <!-- Rodapé -->
      <tr>
        <td style="padding-top:30px; border-top:1px solid #eee;">
          <p style="font-size:12px; color:#999;">
            Este é um e-mail automático, não responda.
          </p>
          <p style="font-size:12px; color:#999;">
            © ${new Date().getFullYear()} ProdPlan
          </p>
        </td>
      </tr>

    </table>
  </td>
</tr>

  </table>
</body>
</html>

    `,
  });
}

export async function sendConfigEmail(companyName: string, companyId: number, machines: string[]) {
    await resend.emails.send({
    from: "no-reply@comms.prodplan.com.br",
    to: 'manolodurli@gmail.com',
    subject: `Nova empresa ${companyName} criada`,
    html: `
      <!DOCTYPE html>

<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nova empresa criada - ProdPlan</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:40px;">

      <!-- Logo -->
      <tr>
        <td align="center" style="padding-bottom: 20px;">
          <h2 style="margin:0; color:#2b2f33;">ProdPlan</h2>
          <p style="margin:5px 0 0 0; color:#888;">Controle de Produção</p>
        </td>
      </tr>

      <!-- Título -->
      <tr>
        <td>
          <h1 style="color:#2b2f33; font-size:22px;">Nova empresa criada</h1>
          <p style="color:#555; font-size:15px;">
            A empresa <strong>${companyName}</strong> foi criada no sistema.
            Abaixo estão as máquinas cadastradas para configuração específica.
          </p>
        </td>
      </tr>

      <!-- Lista de máquinas -->
      <tr>
        <td style="background:#f7f9fb; padding:20px; border-radius:6px;">
          <p style="margin-top:0; font-size:14px; color:#333;"><strong>Máquinas cadastradas:</strong></p>
          
          <ul style="padding-left:20px; margin:10px 0; color:#333; font-size:14px;">
            <li style="margin-bottom:5px;">Empresa id: ${companyId}</li>
            ${machines.map(machine => `<li style="margin-bottom:5px;">${machine}</li>`).join("")}
          </ul>
        </td>
      </tr>

      <!-- Info -->
      <tr>
        <td style="padding-top:20px;">
          <p style="font-size:13px; color:#666;">
            Por favor, realize as configurações necessárias para que a empresa possa iniciar a utilização do sistema corretamente.
          </p>
        </td>
      </tr>

      <!-- Rodapé -->
      <tr>
        <td style="padding-top:30px; border-top:1px solid #eee;">
          <p style="font-size:12px; color:#999;">
            Este é um e-mail automático, não responda.
          </p>
          <p style="font-size:12px; color:#999;">
            © ${new Date().getFullYear()} ProdPlan
          </p>
        </td>
      </tr>

    </table>
  </td>
</tr>

  </table>
</body>
</html>

    `,
  });
}


