<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import HeroConfigurator from '@/components/HeroConfigurator.vue'
import ComoFunciona from '@/components/sections/ComoFunciona.vue'
import CatalogoTeaser from '@/components/sections/CatalogoTeaser.vue'
</script>

<template>
  <div class="bg-paper">
    <AppHeader />
    <HeroConfigurator />
    <ComoFunciona />
    <CatalogoTeaser />
    <!-- ProvaSocial fica de fora até existirem avaliações reais: os números e depoimentos eram ilustrativos. -->
    <AppFooter />
  </div>
</template>
