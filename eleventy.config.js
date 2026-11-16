const rssPlugin = require("@11ty/eleventy-plugin-rss");
const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(rssPlugin);

  // Arquivos passthrough
  eleventyConfig.addPassthroughCopy("src/assets");

  // Filtro de data (pt-BR)
  eleventyConfig.addFilter("dateBR", (dateObj, format = "dd/MM/yyyy") => {
    return DateTime.fromJSDate(dateObj, { zone: "America/Sao_Paulo" }).toFormat(format);
  });

  // Filtro de data ISO
  eleventyConfig.addFilter("dateISO", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "America/Sao_Paulo" }).toISODate();
  });

  // Filtro de slug
  eleventyConfig.addFilter("slug", (str) => {
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  });

  // Filtro de leitura (tempo estimado)
  eleventyConfig.addFilter("readingTime", (text) => {
    const wordsPerMinute = 200;
    const words = String(text || "").split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes < 1 ? 1 : minutes;
  });

  // Filtro de seção → cor
  eleventyConfig.addFilter("sectionColor", (type) => {
    const map = {
      noticia: "#2563EB",
      comunicado: "#E86454",
      formacao: "#0D9488",
      evento: "#0D9488",
      material: "#D97706",
      projeto: "#7C3AED",
    };
    return map[type] || "#2563EB";
  });

  // Filtro de seção → label
  eleventyConfig.addFilter("sectionLabel", (type) => {
    const map = {
      noticia: "Notícia",
      comunicado: "Comunicado",
      formacao: "Formação",
      evento: "Evento",
      material: "Material",
      projeto: "Projeto",
    };
    return map[type] || "Publicação";
  });

  // Data global "now"
  eleventyConfig.addGlobalData("now", () => new Date());

  // Coleções
  eleventyConfig.addCollection("posts", (collection) => {
    return collection.getFilteredByTag("post").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("featured", (collection) => {
    return collection.getFilteredByTag("post").filter((i) => i.data.destaque).sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("formacoes", (collection) => {
    return collection.getFilteredByTag("post").filter((i) => i.data.tipo === "formacao" || i.data.categoria === "formacao").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("materiais", (collection) => {
    return collection.getFilteredByTag("post").filter((i) => i.data.tipo === "material" || i.data.categoria === "material").sort((a, b) => b.date - a.date);
  });

  return {
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md"],
  };
};
