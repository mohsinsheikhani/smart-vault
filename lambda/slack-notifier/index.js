const sendSlackNotification = async (message) => {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: JSON.stringify(message),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Error sending message to Slack: ${response.statusText}`);
    }

    const data = await response.json();
    return `Message sent to Slack: ${JSON.stringify(data)}`;
  } catch (error) {
    throw new Error(`Error sending message to Slack: ${error.message}`);
  }
};

export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const message = event.Records[0].Sns.Message;
    const subject = event.Records[0].Sns.Subject;

    const slackMessage = {
      text: `📢 *EBS Backup Notification* 📢\n\n*Status:* ${subject}\n*Details:* ${message}`,
    };

    return await sendSlackNotification(slackMessage);
  } catch (error) {
    console.error("Error processing event:", error);
    throw error;
  }
};
